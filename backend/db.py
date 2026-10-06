"""All access to ``data/campus_customs.db``.

The database already ships with ``catalogue``, ``inventory``, ``users``, and
``chat_messages`` tables (see the data the course provided). Every read here
is a real query against that file — prices and stock shown to shoppers and
quoted by the chatbot always come from this module, never from the model.
"""

from __future__ import annotations

import json
import sqlite3
from pathlib import Path

from models import CartItemOut, ChatMessageOut, InventoryEntry, Product

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
DB_PATH = ROOT / "data" / "campus_customs.db"


def get_connection() -> sqlite3.Connection:
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA foreign_keys = ON")
    return con


def _ensure_schema() -> None:
    """Add the one table the course data didn't ship with.

    Cart items are account-scoped (mirrors ``chat_messages``: guests get a
    local-only cart in the browser, never a row here — see
    ``frontend/src/cart.tsx``). Run once at import time, not per-connection;
    ``CREATE TABLE IF NOT EXISTS`` makes it a no-op on every run after the
    first, so there's no separate migration step to remember.
    """
    con = get_connection()
    try:
        con.execute(
            """
            CREATE TABLE IF NOT EXISTS cart_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                product_id TEXT NOT NULL,
                size TEXT NOT NULL,
                quantity INTEGER NOT NULL,
                UNIQUE (user_id, product_id, size),
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (product_id) REFERENCES catalogue(product_id)
            )
            """
        )
        con.commit()
    finally:
        con.close()


_ensure_schema()


def _row_to_product(row: sqlite3.Row, inventory: list[InventoryEntry]) -> Product:
    return Product(
        product_id=row["product_id"],
        name=row["name"],
        garment_type=row["garment_type"],
        description=row["description"],
        colors=json.loads(row["colors"] or "[]"),
        search_tags=json.loads(row["search_tags"] or "[]"),
        image_file_path=row["image_file_path"],
        image_url=f"/media/{row['image_file_path']}",
        price=row["price"],
        inventory=inventory,
        total_stock=sum(i.quantity for i in inventory),
    )


def _inventory_for(con: sqlite3.Connection, product_ids: list[str]) -> dict[str, list[InventoryEntry]]:
    if not product_ids:
        return {}
    placeholders = ",".join("?" for _ in product_ids)
    rows = con.execute(
        f"SELECT product_id, size, quantity FROM inventory WHERE product_id IN ({placeholders})",
        product_ids,
    ).fetchall()
    by_product: dict[str, list[InventoryEntry]] = {pid: [] for pid in product_ids}
    for r in rows:
        by_product.setdefault(r["product_id"], []).append(
            InventoryEntry(size=r["size"], quantity=r["quantity"])
        )
    return by_product


def list_products() -> list[Product]:
    """Every catalogue row, with its inventory attached."""
    con = get_connection()
    try:
        rows = con.execute("SELECT * FROM catalogue ORDER BY name").fetchall()
        by_product = _inventory_for(con, [r["product_id"] for r in rows])
        return [_row_to_product(r, by_product.get(r["product_id"], [])) for r in rows]
    finally:
        con.close()


def get_product(product_id: str) -> Product | None:
    con = get_connection()
    try:
        row = con.execute(
            "SELECT * FROM catalogue WHERE product_id = ?", (product_id,)
        ).fetchone()
        if row is None:
            return None
        inventory = _inventory_for(con, [product_id]).get(product_id, [])
        return _row_to_product(row, inventory)
    finally:
        con.close()


def get_user_by_email(con: sqlite3.Connection, email: str) -> sqlite3.Row | None:
    return con.execute(
        "SELECT * FROM users WHERE lower(email) = lower(?)", (email,)
    ).fetchone()


def create_user(first_name: str, last_name: str, email: str, password_hash: str) -> sqlite3.Row:
    con = get_connection()
    try:
        cur = con.execute(
            """
            INSERT INTO users (name, email, password_hash, first_name, last_name)
            VALUES (?, ?, ?, ?, ?)
            """,
            (f"{first_name} {last_name}".strip(), email, password_hash, first_name, last_name),
        )
        con.commit()
        return con.execute(
            "SELECT * FROM users WHERE id = ?", (cur.lastrowid,)
        ).fetchone()
    finally:
        con.close()


def find_user_for_login(email: str) -> sqlite3.Row | None:
    con = get_connection()
    try:
        return get_user_by_email(con, email)
    finally:
        con.close()


def get_user_by_id(user_id: int) -> sqlite3.Row | None:
    """Looked up once per chat turn so the agent knows who it's talking to."""
    con = get_connection()
    try:
        return con.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    finally:
        con.close()


def save_chat_message(
    user_id: int, role: str, content: str, products: list[Product] | None = None
) -> None:
    con = get_connection()
    try:
        products_json = (
            json.dumps([p.model_dump() for p in products], ensure_ascii=False)
            if products
            else None
        )
        con.execute(
            """
            INSERT INTO chat_messages (user_id, role, content, products_json)
            VALUES (?, ?, ?, ?)
            """,
            (user_id, role, content, products_json),
        )
        con.commit()
    finally:
        con.close()


def _stock_for_size(product: Product, size: str) -> int:
    entry = next((i for i in product.inventory if i.size == size), None)
    return entry.quantity if entry else 0


def get_cart(user_id: int) -> list[CartItemOut]:
    """A shopper's cart, each line re-joined against the live catalogue —
    price and stock shown in the cart are never stale copies from whenever
    the item was added."""
    con = get_connection()
    try:
        rows = con.execute(
            "SELECT product_id, size, quantity FROM cart_items WHERE user_id = ? ORDER BY id",
            (user_id,),
        ).fetchall()
    finally:
        con.close()

    items: list[CartItemOut] = []
    for r in rows:
        product = get_product(r["product_id"])
        if product is None:
            continue  # Product removed from the catalogue since it was added.
        items.append(CartItemOut(product=product, size=r["size"], quantity=r["quantity"]))
    return items


def add_to_cart(user_id: int, product_id: str, size: str, quantity: int) -> list[CartItemOut]:
    """Add ``quantity`` of one size to a cart, clamped to live stock.

    If the same product+size is already in the cart, this adds to the
    existing line rather than duplicating it (the ``UNIQUE`` constraint on
    ``cart_items`` is what makes "the same line" well-defined). Clamping to
    stock here, not just in the UI, matters for the same reason stock is
    double-checked everywhere else in this app: the number on screen when
    the shopper clicked "Add" may already be stale.
    """
    product = get_product(product_id)
    if product is None:
        return get_cart(user_id)
    available = _stock_for_size(product, size)

    con = get_connection()
    try:
        existing = con.execute(
            "SELECT quantity FROM cart_items WHERE user_id = ? AND product_id = ? AND size = ?",
            (user_id, product_id, size),
        ).fetchone()
        current_qty = existing["quantity"] if existing else 0
        new_qty = min(current_qty + max(quantity, 0), available)

        if new_qty <= 0:
            con.execute(
                "DELETE FROM cart_items WHERE user_id = ? AND product_id = ? AND size = ?",
                (user_id, product_id, size),
            )
        elif existing:
            con.execute(
                "UPDATE cart_items SET quantity = ? WHERE user_id = ? AND product_id = ? AND size = ?",
                (new_qty, user_id, product_id, size),
            )
        else:
            con.execute(
                "INSERT INTO cart_items (user_id, product_id, size, quantity) VALUES (?, ?, ?, ?)",
                (user_id, product_id, size, new_qty),
            )
        con.commit()
    finally:
        con.close()
    return get_cart(user_id)


def set_cart_item_quantity(
    user_id: int, product_id: str, size: str, quantity: int
) -> list[CartItemOut]:
    """Set a cart line to an exact quantity (0 removes it), clamped to stock."""
    product = get_product(product_id)
    available = _stock_for_size(product, size) if product else 0
    clamped = max(0, min(quantity, available))

    con = get_connection()
    try:
        if clamped <= 0:
            con.execute(
                "DELETE FROM cart_items WHERE user_id = ? AND product_id = ? AND size = ?",
                (user_id, product_id, size),
            )
        else:
            con.execute(
                """
                INSERT INTO cart_items (user_id, product_id, size, quantity)
                VALUES (?, ?, ?, ?)
                ON CONFLICT (user_id, product_id, size)
                DO UPDATE SET quantity = excluded.quantity
                """,
                (user_id, product_id, size, clamped),
            )
        con.commit()
    finally:
        con.close()
    return get_cart(user_id)


def chat_history(user_id: int, limit: int = 50) -> list[ChatMessageOut]:
    con = get_connection()
    try:
        rows = con.execute(
            """
            SELECT role, content, products_json, created_at
            FROM chat_messages
            WHERE user_id = ?
            ORDER BY id ASC
            LIMIT ?
            """,
            (user_id, limit),
        ).fetchall()
        out = []
        for r in rows:
            products_raw = json.loads(r["products_json"]) if r["products_json"] else []
            out.append(
                ChatMessageOut(
                    role=r["role"],
                    content=r["content"],
                    products=[Product.model_validate(p) for p in products_raw],
                    created_at=r["created_at"],
                )
            )
        return out
    finally:
        con.close()

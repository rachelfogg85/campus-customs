"""Campus Customs storefront API.

Serves the product catalog (with images and live inventory), account
signup/login, and the pydantic-ai shopping assistant behind ``/api/chat``.
This is the file you run with Uvicorn.

Run from backend/:  uvicorn main:app --reload --port 8000
Open API docs:      http://127.0.0.1:8000/docs
Frontend (Vite):    http://127.0.0.1:5174
"""

from __future__ import annotations

import asyncio
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

import db
from agent import run_agent
from auth import hash_password, verify_password
from models import (
    AddToCartRequest,
    CartResponse,
    ChatMessageOut,
    ChatRequest,
    ChatResponse,
    LoginRequest,
    ProductsResponse,
    SetCartItemRequest,
    SignupRequest,
    UserOut,
)

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent

app = FastAPI(title="Campus Customs", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/media", StaticFiles(directory=ROOT / "data"), name="media")


@app.get("/api/health")
def health():
    return {"ok": True, "db": db.DB_PATH.name}


@app.get("/api/products", response_model=ProductsResponse)
def list_products():
    """Every product in the catalog, with live inventory, for the storefront grid."""
    products = db.list_products()
    return ProductsResponse(count=len(products), products=products)


@app.get("/api/products/{product_id}")
def get_product(product_id: str):
    product = db.get_product(product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@app.post("/api/auth/signup", response_model=UserOut)
def signup(body: SignupRequest):
    if db.find_user_for_login(body.email) is not None:
        raise HTTPException(
            status_code=409, detail="An account with this email already exists"
        )
    row = db.create_user(
        body.first_name, body.last_name, body.email, hash_password(body.password)
    )
    return UserOut(
        id=row["id"],
        first_name=row["first_name"],
        last_name=row["last_name"],
        name=row["name"],
        email=row["email"],
    )


@app.post("/api/auth/login", response_model=UserOut)
def login(body: LoginRequest):
    row = db.find_user_for_login(body.email)
    if row is None or not verify_password(body.password, row["password_hash"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    return UserOut(
        id=row["id"],
        first_name=row["first_name"],
        last_name=row["last_name"],
        name=row["name"],
        email=row["email"],
    )


def _cart_response(items: list) -> CartResponse:
    subtotal = sum(i.product.price * i.quantity for i in items)
    item_count = sum(i.quantity for i in items)
    return CartResponse(items=items, subtotal=round(subtotal, 2), item_count=item_count)


@app.get("/api/cart", response_model=CartResponse)
def get_cart(user_id: int):
    """A logged-in shopper's cart. Guests never call this — their cart lives
    only in the browser (see ``frontend/src/cart.tsx``)."""
    return _cart_response(db.get_cart(user_id))


@app.post("/api/cart/items", response_model=CartResponse)
def add_cart_item(body: AddToCartRequest):
    """Add a size/quantity to the cart, or increase an existing line.

    Quantity is clamped to live stock in ``db.add_to_cart`` — the number
    shown on screen when the shopper clicked "Add" may already be stale, so
    it's re-checked here, not trusted from the request.
    """
    items = db.add_to_cart(body.user_id, body.product_id, body.size, body.quantity)
    return _cart_response(items)


@app.put("/api/cart/items", response_model=CartResponse)
def set_cart_item(body: SetCartItemRequest):
    """Set a cart line to an exact quantity; 0 removes it."""
    items = db.set_cart_item_quantity(
        body.user_id, body.product_id, body.size, body.quantity
    )
    return _cart_response(items)


@app.get("/api/chat/history", response_model=list[ChatMessageOut])
def get_chat_history(user_id: int):
    """A logged-in shopper's past conversation, reloaded when they return.

    Guests have no ``user_id`` to call this with, which is fine — the
    history feature is explicitly logged-in-only.
    """
    return db.chat_history(user_id)


@app.post("/api/chat", response_model=ChatResponse)
async def chat(body: ChatRequest):
    """Answer a shopper's message with the pydantic-ai agent.

    ``async def`` (awaiting ``run_agent`` directly) rather than a sync route
    wrapping its own event loop — this is what lets ``agent.py`` safely cache
    and reuse one ``Agent``/HTTP client across every request instead of
    rebuilding them per message (see the usability improvement documented in
    ``agent.py`` and ``output/usability.md``). The three plain sqlite calls
    below are each nudged off the event loop with ``asyncio.to_thread`` so a
    slow disk read can't stall other requests being handled concurrently.

    When the request carries a logged-in ``user_id``, both sides of the
    exchange are saved to ``chat_messages`` (the assistant row's
    ``products_json`` is exactly what powers "matching items" in the UI),
    and the agent is told that shopper's name/email so it knows who it's
    talking to. Guest messages (no ``user_id``) still get a real answer,
    just anonymously and without being saved. ``product_id``, if present,
    tells the agent which product page the shopper is currently viewing.
    """
    user_name: str | None = None
    user_email: str | None = None

    if body.user_id is not None:
        await asyncio.to_thread(db.save_chat_message, body.user_id, "user", body.message)
        user_row = await asyncio.to_thread(db.get_user_by_id, body.user_id)
        if user_row is not None:
            user_name = user_row["first_name"] or user_row["name"]
            user_email = user_row["email"]

    result = await run_agent(
        body.message,
        user_name=user_name,
        user_email=user_email,
        product_id=body.product_id,
    )
    response = ChatResponse(
        reply=result.get("reply", ""),
        products=result.get("products") or [],
        tools_used=list(result.get("tools_used") or []),
    )

    if body.user_id is not None:
        await asyncio.to_thread(
            db.save_chat_message,
            body.user_id,
            "assistant",
            response.reply,
            response.products,
        )

    return response


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)

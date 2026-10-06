"""Pydantic data objects shared by the API layer, the agent, and its tools."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, EmailStr, Field, model_validator


class InventoryEntry(BaseModel):
    """Stock for one size of one product."""

    size: str
    quantity: int


class Product(BaseModel):
    """One row of ``catalogue``, joined with its ``inventory`` rows.

    This is the shape shown in the storefront grid and attached to chat
    replies as "matching items" — the same shape already recorded in the
    seed ``chat_messages.products_json`` data.
    """

    product_id: str
    name: str
    garment_type: str
    description: str
    colors: list[str] = Field(default_factory=list)
    search_tags: list[str] = Field(default_factory=list)
    image_file_path: str
    image_url: str
    price: float
    inventory: list[InventoryEntry] = Field(default_factory=list)
    total_stock: int = 0


class ProductsResponse(BaseModel):
    count: int
    products: list[Product]


class SearchProductsResult(BaseModel):
    """Structured return value of the ``search_products`` tool."""

    query: str
    total_matches: int
    returned: int
    products: list[Product] = Field(default_factory=list)


class ProductInfoResult(BaseModel):
    """Structured return value of the ``get_product_info`` tool.

    ``found`` lets the model tell "this id doesn't exist" apart from "this
    product has no description" — both are falsy-ish, so collapsing them
    into one field would make a missing product look like an empty one.
    """

    found: bool
    product: Product | None = None


class StockCheckResult(BaseModel):
    """Structured return value of the ``check_stock`` tool.

    Wraps the full ``Product`` (not a reduced subset) so a stock question
    still carries everything needed to show a matching product card in the
    chat UI, plus three fields specific to a *size* question:

    - ``requested_size``: the size actually looked up, after normalizing
      something like "medium" to "M" — echoed back so the agent's answer
      can confirm what it checked.
    - ``requested_size_quantity``: the exact unit count for that size, or
      ``None`` if no size was requested or the size isn't one the product
      comes in.
    - ``in_stock_for_requested_size``: an explicit boolean rather than
      leaving the model to infer "in stock" from a raw quantity — the tool
      does that one piece of arithmetic in code so the agent can't get it
      wrong or hedge on a quantity of zero.
    """

    found: bool
    product: Product | None = None
    requested_size: str | None = None
    requested_size_quantity: int | None = None
    in_stock_for_requested_size: bool | None = None


class CartItemOut(BaseModel):
    """One line in a shopper's cart.

    Carries the full ``Product`` (not just a ``product_id``) so the cart
    page never has to make N extra requests to render images/names/prices —
    and because it's freshly re-joined against the catalogue on every read
    (see ``db.get_cart``), the price and stock shown are always current, not
    whatever they were when the item was added.
    """

    product: Product
    size: str
    quantity: int


class CartResponse(BaseModel):
    """Whole-cart summary — ``subtotal``/``item_count`` are computed once on
    the server so the cart page and the nav badge can't disagree with each
    other by implementing the sum differently."""

    items: list[CartItemOut] = Field(default_factory=list)
    subtotal: float
    item_count: int


class AddToCartRequest(BaseModel):
    user_id: int
    product_id: str
    size: str
    quantity: int = Field(default=1, ge=1, le=99)


class SetCartItemRequest(BaseModel):
    user_id: int
    product_id: str
    size: str
    # 0 is a valid, meaningful value here — it's how the frontend removes a
    # line — so this isn't reusing AddToCartRequest's ge=1 quantity field.
    quantity: int = Field(ge=0, le=99)


class SignupRequest(BaseModel):
    first_name: str = Field(min_length=1, max_length=80)
    last_name: str = Field(min_length=1, max_length=80)
    email: EmailStr
    password: str = Field(min_length=8, max_length=200)
    confirm_password: str = Field(min_length=8, max_length=200)

    @model_validator(mode="after")
    def passwords_match(self) -> "SignupRequest":
        if self.password != self.confirm_password:
            raise ValueError("Passwords do not match")
        return self


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=200)


class UserOut(BaseModel):
    id: int
    first_name: str | None = None
    last_name: str | None = None
    name: str
    email: str


class ChatRequest(BaseModel):
    message: str = Field(min_length=1)
    user_id: int | None = None
    # The product_id of whatever product page the shopper is currently on,
    # if any — lets "do you have this in pink" resolve to a specific item
    # without the shopper having to name it.
    product_id: str | None = None


class ChatMessageOut(BaseModel):
    role: str
    content: str
    products: list[Product] = Field(default_factory=list)
    created_at: str | None = None


class ChatResponse(BaseModel):
    reply: str
    products: list[Product] = Field(default_factory=list)
    tools_used: list[str] = Field(default_factory=list)


class ToolCall(BaseModel):
    """One tool invocation — doubles as the "tools used" pills in the UI
    (``name`` only) and a row in the audit trail (``name`` + ``args`` +
    ``result_preview``)."""

    name: str
    args: dict[str, Any] = Field(default_factory=dict)
    result_preview: str = ""


class AuditEntry(BaseModel):
    """One ``run_agent()`` call, appended to ``output/audit_trail.json``.

    Deliberately flat and complete rather than referencing other files: an
    auditor reading this JSON later shouldn't need the live database or the
    chat_messages table to understand what happened on a given turn — the
    message, every tool call with its arguments and a preview of what it
    returned, the final reply, and why the run ended are all right here.
    """

    time: datetime
    user_message: str
    tool_calls: list[ToolCall] = Field(default_factory=list)
    reply: str = ""
    stop_reason: str = ""

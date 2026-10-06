"""The agent's tools, all grounded in ``campus_customs.db``.

``search_products`` finds candidates by free text. ``get_product_info`` is an
exact lookup by id for description/price. ``check_stock`` answers "how many
are in stock" questions, resolved to a specific size whenever one is asked
about, so the agent never has to infer availability from a raw list itself.
"""

from __future__ import annotations

import re
from functools import lru_cache
from time import time

from db import get_product, list_products
from models import ProductInfoResult, Product, SearchProductsResult, StockCheckResult

MAX_RESULTS = 12
CACHE_TTL_SECONDS = 30

# Common words that appear in nearly every product name or description and
# would otherwise swamp real signal ("Yale" is on every item in the store).
STOPWORDS = {
    "a", "an", "and", "any", "are", "at", "be", "by", "campus", "customs",
    "do", "does", "for", "from", "get", "have", "how", "i", "in", "is", "it",
    "looking", "me", "much", "my", "of", "on", "or", "please", "show", "some",
    "that", "the", "there", "this", "to", "want", "what", "which", "with",
    "yale", "you", "your",
}

FIELD_WEIGHTS: list[tuple[str, float]] = [
    ("name", 5.0),
    ("garment_type", 3.0),
    ("colors", 3.0),
    ("search_tags", 2.5),
    ("description", 1.0),
]

# The catalog only ever uses these six codes (verified against every row in
# `inventory`). Shoppers ask in plain English, so spelled-out and
# abbreviated forms all resolve to the code actually stored in the database.
SIZE_ALIASES: dict[str, str] = {
    "xs": "XS", "extra small": "XS", "x-small": "XS",
    "s": "S", "small": "S",
    "m": "M", "med": "M", "medium": "M",
    "l": "L", "large": "L",
    "xl": "XL", "extra large": "XL", "x-large": "XL",
    "xxl": "XXL", "2xl": "XXL", "double extra large": "XXL",
    "extra extra large": "XXL", "xx-large": "XXL",
}


def _normalize_size(raw: str) -> str:
    """Map shopper phrasing ("medium", "XL") onto the database's size codes.

    Falls through to the uppercased input unchanged if it's not a known
    alias, so an unrecognized size still gets echoed back for an honest "we
    don't carry that size" rather than silently dropped.
    """
    return SIZE_ALIASES.get(raw.strip().lower(), raw.strip().upper())


@lru_cache(maxsize=1)
def _cached_products(_cache_bucket: int) -> list[Product]:
    return list_products()


def _load_products() -> list[Product]:
    # Re-reads the DB every CACHE_TTL_SECONDS so stock changes made elsewhere
    # show up without a restart, while normal chat traffic hits the cache.
    bucket = int(time() // CACHE_TTL_SECONDS)
    return _cached_products(bucket)


def _tokenize(query: str) -> list[str]:
    words = re.findall(r"[a-z0-9']+", query.lower())
    meaningful = [w for w in words if w not in STOPWORDS and len(w) > 1]
    return meaningful or words


def _haystack(product: Product, field: str) -> str:
    value = getattr(product, field)
    if isinstance(value, list):
        return " ".join(str(v) for v in value).lower()
    return str(value or "").lower()


def _token_variants(token: str) -> tuple[str, ...]:
    """A plain vs. plural form of a token.

    Found by testing: "What hoodies do you have?" returned zero matches
    because the catalog's `garment_type` says "pullover hoodie" (singular)
    and plain substring matching means "hoodies" is never a substring of
    "hoodie" — nor the reverse. Shoppers don't think about which form the
    catalog happens to use, so both have to be tried. This is deliberately
    simple suffix stripping, not real stemming: good enough for "hoodie(s)"
    and "crewneck(s)" without a dependency, without pretending to handle
    every irregular English plural.
    """
    if token.endswith("s") and len(token) > 3:
        return (token, token[:-1])
    return (token, f"{token}s")


def _score(product: Product, tokens: list[str]) -> float:
    total = 0.0
    for field, weight in FIELD_WEIGHTS:
        haystack = _haystack(product, field)
        if not haystack:
            continue
        for token in tokens:
            variants = _token_variants(token)
            if not any(v in haystack for v in variants):
                continue
            if any(re.search(rf"\b{re.escape(v)}\b", haystack) for v in variants):
                total += weight
            else:
                total += weight * 0.4
    return total


def search_products(query: str, limit: int = MAX_RESULTS, in_stock_only: bool = False) -> dict:
    """Search the product catalog by name, garment type, color, or description.

    Args:
        query: Free text, e.g. "navy hoodie", "crewneck under $60", "sailing gear".
        limit: Maximum products to return; hard-capped at MAX_RESULTS.
        in_stock_only: If true, drop products with zero total stock.

    Returns:
        A ``SearchProductsResult`` dump: the query, how many matched in
        total, and the returned products (each with price and per-size
        inventory already attached).
    """
    limit = max(1, min(limit, MAX_RESULTS))
    products = _load_products()
    tokens = _tokenize(query)

    scored = [(p, _score(p, tokens)) for p in products]
    matches = [(p, s) for p, s in scored if s > 0]
    if in_stock_only:
        matches = [(p, s) for p, s in matches if p.total_stock > 0]
    matches.sort(key=lambda ps: ps[1], reverse=True)
    top = [p for p, _ in matches[:limit]]

    return SearchProductsResult(
        query=query,
        total_matches=len(matches),
        returned=len(top),
        products=top,
    ).model_dump()


def get_product_info(product_id: str) -> dict:
    """Look up one product's description and price by its exact product_id.

    Args:
        product_id: The id returned by a prior ``search_products`` call.

    Returns:
        A ``ProductInfoResult`` dump — ``found: False`` if the id doesn't
        exist, otherwise the full product (description, price, and current
        per-size inventory).
    """
    product = get_product(product_id)
    return ProductInfoResult(found=product is not None, product=product).model_dump()


def check_stock(product_id: str, size: str | None = None) -> dict:
    """Check how many units of a product are in stock, by size if one is given.

    Call this whenever a shopper asks "is this in stock", "how many do you
    have", or names a specific size ("do you have a medium?"). Always pass
    ``size`` when the shopper mentioned one — the tool resolves it to the
    database's exact size code and reports availability for that size
    specifically, rather than leaving you to read a raw inventory list.

    Args:
        product_id: The id returned by a prior ``search_products`` call.
        size: A size as the shopper said it (e.g. "medium", "XL"), or
            omitted to get the full per-size breakdown.

    Returns:
        A ``StockCheckResult`` dump. ``found: False`` if the product id
        doesn't exist. If ``size`` was given, ``requested_size_quantity``
        and ``in_stock_for_requested_size`` give a definitive, unambiguous
        answer for that size — ``in_stock_for_requested_size`` is ``None``
        only when the requested size isn't one this product comes in at all.
    """
    product = get_product(product_id)
    if product is None:
        return StockCheckResult(found=False).model_dump()

    if size is None:
        return StockCheckResult(found=True, product=product).model_dump()

    normalized = _normalize_size(size)
    entry = next((i for i in product.inventory if i.size == normalized), None)
    return StockCheckResult(
        found=True,
        product=product,
        requested_size=normalized,
        requested_size_quantity=entry.quantity if entry else None,
        in_stock_for_requested_size=(entry.quantity > 0) if entry else None,
    ).model_dump()

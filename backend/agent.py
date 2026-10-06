"""The Campus Customs shopping assistant.

Exposes ``run_agent(message, ...) -> {"reply": str, "products": [...],
"tools_used": [...]}``, which ``main.py`` calls from ``/api/chat``. Every
product the agent's tools returned during the run is surfaced in ``products``
so the frontend can highlight matching items alongside the reply — the same
shape already used in the seed ``chat_messages.products_json`` data.
"""

from __future__ import annotations

import json
import os
import re
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path
from typing import Any

import httpx
from dotenv import load_dotenv
from pydantic_ai import Agent, RunContext, UsageLimits
from pydantic_ai.models.openai import OpenAIResponsesModel
from pydantic_ai.providers.openai import OpenAIProvider

from models import AuditEntry, Product, ToolCall
from tools import check_stock as check_stock_impl
from tools import get_product_info as get_product_info_impl
from tools import search_products

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
PROMPT_PATH = HERE / "prompts" / "prompt.md"
AUDIT_PATH = ROOT / "output" / "audit_trail.json"

# The .env may sit in this folder, at the repo root (where .env.example
# lives, for anyone who clones this repo standalone), or one level up in
# the original course folder this project started in.
load_dotenv(HERE / ".env")
load_dotenv(ROOT / ".env")
load_dotenv(ROOT.parent / ".env")

MODEL = os.environ.get("MODEL_NAME", "gpt-6-astra")
PORTKEY_BASE_URL = os.environ.get("PORTKEY_BASE_URL", "https://api.portkey.ai/v1")

# One turn to call a tool, one to read the result, plus headroom for a search
# followed by a detail lookup.
REQUEST_LIMIT = 8
MAX_PRODUCTS_SHOWN = 8

# Matches a specific price ("$32"), a categorical stock claim ("in stock",
# "out of stock", "sold out"), or a quantified one ("5 left", "12 available")
# — phrasing that only makes sense backed by a real lookup. Deliberately
# narrower than words like "available"/"left" alone, which show up in enough
# unrelated sentences to make this trigger on ordinary chit-chat.
_UNGROUNDED_CLAIM_PATTERN = re.compile(
    r"\$\d|\bin stock\b|\bout of stock\b|\bsold out\b|"
    r"\b\d+\s+(?:left|available|units?|in stock)\b",
    re.IGNORECASE,
)


def _claims_product_facts_without_tools(reply: str, tool_names: list[str]) -> bool:
    """True if ``reply`` sounds like a price/stock answer but no tool ran.

    Usability improvement (backend, safety/accuracy): the system prompt
    already tells the model to never answer a price or stock question
    without calling a tool first, and in practice it reliably does. This is
    the backstop for the rare case that instruction doesn't hold — a
    code-level check that can't be argued with or jailbroken the way a
    prompt instruction can be, because it runs after generation and doesn't
    care what the model was told, only what it actually did (`tool_names`,
    recorded by the real tool calls in this module, not self-reported by the
    model). It only has to be right about "did any tool run," which is an
    objective fact, not a judgment call.
    """
    return not tool_names and bool(_UNGROUNDED_CLAIM_PATTERN.search(reply))


class Deps:
    """Per-run context: who's chatting, what page they're on, and a
    scratchpad of every tool call made (for both the UI's "tools used"
    pills and the audit trail) and every product they surfaced.

    ``user_name``/``user_email`` and ``product_id`` are injected into the
    model's instructions fresh on every run (see ``shopper_context`` in
    ``build_agent``) — this is "customer memory" within a single turn: the
    agent always knows who it's talking to and what they're looking at
    without having to ask or call a tool to find out.
    """

    def __init__(
        self,
        user_name: str | None = None,
        user_email: str | None = None,
        product_id: str | None = None,
    ) -> None:
        self.user_name = user_name
        self.user_email = user_email
        self.product_id = product_id
        self.tool_calls: list[ToolCall] = []
        self.products: dict[str, Product] = {}

    def record(self, name: str, args: dict[str, Any], result: Any) -> None:
        self.tool_calls.append(
            ToolCall(name=name, args=args, result_preview=_preview(result))
        )

    def record_products(self, products: list[dict[str, Any]]) -> None:
        for raw in products:
            product = Product.model_validate(raw)
            # Keep the first (highest-ranked) occurrence if the same item
            # turns up again from a later tool call.
            self.products.setdefault(product.product_id, product)

    @property
    def tool_names(self) -> list[str]:
        """Deduplicated, ordered tool names — what the UI shows as pills."""
        return list(dict.fromkeys(c.name for c in self.tool_calls))


def _preview(value: Any, limit: int = 300) -> str:
    """A short, safe-to-log stand-in for a tool result in the audit trail."""
    try:
        text = json.dumps(value, ensure_ascii=False, default=str)
    except (TypeError, ValueError):
        text = str(value)
    return text if len(text) <= limit else text[:limit] + "…"


@lru_cache(maxsize=1)
def build_agent() -> Agent[Deps, str]:
    """Build the Agent once per process and reuse it for every chat request.

    Usability improvement (backend, speed/cost): before this, every single
    `/api/chat` call constructed a brand-new `httpx.AsyncClient` (a fresh TCP
    + TLS handshake to Portkey), a brand-new `Agent`, and re-ran all three
    `@agent.tool`/`@agent.instructions` registrations — none of which depend
    on anything request-specific, since the actual per-request state
    (who's chatting, what they asked, what tools fired) all lives in the
    `Deps` instance `run_agent` creates fresh on every call. Caching the
    built `Agent` lets the underlying HTTP connection pool be kept warm
    across requests, which cuts the handshake cost off of every reply after
    the first and reduces object-construction overhead per message — a
    shopper chatting back-to-back gets faster responses, and the backend
    does less repeated work per dollar of model usage.
    """
    provider = OpenAIProvider(
        api_key=os.environ.get("OPENAI_API_KEY", "unused-with-portkey"),
        base_url=PORTKEY_BASE_URL,
        http_client=httpx.AsyncClient(
            headers={"x-portkey-api-key": os.environ.get("PORTKEY_API_KEY", "")},
            timeout=60.0,
        ),
    )

    agent = Agent(
        # gpt-6-astra only supports function tools on the Responses API, not
        # Chat Completions (it 400s there unless reasoning_effort="none").
        OpenAIResponsesModel(MODEL, provider=provider),
        deps_type=Deps,
        instructions=PROMPT_PATH.read_text(encoding="utf-8"),
    )

    @agent.instructions
    def shopper_context(ctx: RunContext[Deps]) -> str:
        """Appended to the static prompt on every run — who's chatting and
        what they're looking at, pulled straight from Deps rather than a
        tool call, since it's already known the moment the request arrives.
        """
        lines: list[str] = []
        if ctx.deps.user_name:
            identity = f"You're chatting with {ctx.deps.user_name}"
            if ctx.deps.user_email:
                identity += f" ({ctx.deps.user_email})"
            identity += (
                ". You may use their first name naturally — e.g. in a greeting "
                "or when confirming an order detail — but don't force it into "
                "every reply."
            )
            lines.append(identity)
        else:
            lines.append(
                "This shopper is browsing as a guest and is not logged in. "
                "Don't address them by name, and don't ask them to log in "
                "unless they ask about saving/recalling past chat history."
            )

        if ctx.deps.product_id:
            lines.append(
                f'The shopper is currently looking at the product page for '
                f'product_id="{ctx.deps.product_id}". If they refer to "this", '
                f'"it", "this one", or similar without naming an item, assume '
                f"they mean this product — call get_product_info or "
                f"check_stock directly with this product_id instead of "
                f"searching for it again."
            )

        return "\n\n".join(lines)

    @agent.tool
    def search_products_tool(
        ctx: RunContext[Deps], query: str, limit: int = 12, in_stock_only: bool = False
    ) -> dict:
        """Search the product catalog by name, garment type, color, or description."""
        args = {"query": query, "limit": limit, "in_stock_only": in_stock_only}
        result = search_products(query, limit, in_stock_only)
        ctx.deps.record("search_products", args, result)
        ctx.deps.record_products(result["products"])
        return result

    @agent.tool
    def get_product_info(ctx: RunContext[Deps], product_id: str) -> dict:
        """Look up one product's description and price by its exact product_id."""
        result = get_product_info_impl(product_id)
        ctx.deps.record("get_product_info", {"product_id": product_id}, result)
        if result.get("found"):
            ctx.deps.record_products([result["product"]])
        return result

    @agent.tool
    def check_stock(
        ctx: RunContext[Deps], product_id: str, size: str | None = None
    ) -> dict:
        """Check how many units of a product are in stock, by size if one is given."""
        result = check_stock_impl(product_id, size)
        ctx.deps.record(
            "check_stock", {"product_id": product_id, "size": size}, result
        )
        if result.get("found") and result.get("product"):
            ctx.deps.record_products([result["product"]])
        return result

    return agent


async def run_agent(
    message: str,
    *,
    user_name: str | None = None,
    user_email: str | None = None,
    product_id: str | None = None,
) -> dict:
    """Answer one shopper message.

    ``user_name``/``user_email`` identify a logged-in shopper (``None`` for a
    guest); ``product_id`` is the product page they're currently on, if any.
    Both are passed straight through to ``Deps`` so the agent has them before
    the first token is generated.

    This is ``async`` (and ``main.py``'s route awaits it directly) rather
    than wrapping an internal ``asyncio.run(...)`` — pairs with the cached
    ``build_agent()`` above: reusing one ``Agent``/HTTP client safely across
    requests requires everything to run on the *same* event loop. A fresh
    ``asyncio.run()`` per call spins up and tears down a whole new event loop
    just to make one network call, which is itself wasted work on top of not
    being able to share connections.

    Returns ``{"reply": str, "products": [...], "tools_used": [...]}``.
    Failures come back in the same shape with the problem described in
    ``reply``, so the API layer never has to special-case an exception.
    Every call — success, guardrail override, missing key, or exception —
    appends exactly one row to ``output/audit_trail.json`` before returning.
    """
    started = datetime.now(timezone.utc)
    deps = Deps(user_name=user_name, user_email=user_email, product_id=product_id)

    if not os.environ.get("PORTKEY_API_KEY"):
        return _finish(
            message,
            started,
            deps,
            reply="PORTKEY_API_KEY is missing. Add it to .env in the hw4 folder or the course root.",
            stop_reason="missing_api_key",
        )

    try:
        result = await build_agent().run(
            message,
            deps=deps,
            usage_limits=UsageLimits(request_limit=REQUEST_LIMIT),
        )
        reply = result.output
        stop_reason = "completed"
        if _claims_product_facts_without_tools(reply, deps.tool_names):
            reply = (
                "I don't want to guess at that — let me actually check the "
                "database instead of answering from memory. Could you ask "
                "that again, naming the item (or size) you mean?"
            )
            # Distinct from "completed" so the audit trail shows, in plain
            # text, every time the safety-net backstop (not just the prompt)
            # was the thing that kept an ungrounded claim from going out.
            stop_reason = "completed_grounding_override"
    except Exception as exc:
        return _finish(
            message,
            started,
            deps,
            reply=f"The assistant hit an error: {exc}",
            stop_reason=f"error: {type(exc).__name__}",
        )

    return _finish(message, started, deps, reply=reply, stop_reason=stop_reason)


def _finish(
    message: str,
    started: datetime,
    deps: Deps,
    *,
    reply: str,
    stop_reason: str,
) -> dict:
    """Assemble the API response and append the matching audit row.

    One function so every return path — success, guardrail override,
    missing key, exception — goes through the same audit-write, instead of
    each branch having to remember to do it separately.
    """
    _append_audit(
        AuditEntry(
            time=started,
            user_message=message,
            tool_calls=deps.tool_calls,
            reply=reply,
            stop_reason=stop_reason,
        )
    )
    products = list(deps.products.values())[:MAX_PRODUCTS_SHOWN]
    return {
        "reply": reply,
        "products": [p.model_dump() for p in products],
        "tools_used": deps.tool_names,
    }


def _append_audit(entry: AuditEntry) -> None:
    """Append one run to the audit trail, preserving every earlier row.

    Append-only by construction: always reads the existing array first and
    writes it back with the new entry on the end, never truncates. Never
    raises — a broken audit file should not cost a shopper their answer. A
    corrupted existing file is moved aside (``.corrupt.json``) rather than
    overwritten, so a bad write never silently destroys prior history.
    """
    try:
        AUDIT_PATH.parent.mkdir(parents=True, exist_ok=True)
        rows: list[dict] = []
        if AUDIT_PATH.exists():
            try:
                existing = json.loads(AUDIT_PATH.read_text(encoding="utf-8"))
                if isinstance(existing, list):
                    rows = existing
            except json.JSONDecodeError:
                AUDIT_PATH.replace(AUDIT_PATH.with_suffix(".corrupt.json"))
        rows.append(entry.model_dump(mode="json"))
        AUDIT_PATH.write_text(
            json.dumps(rows, indent=2, ensure_ascii=False), encoding="utf-8"
        )
    except OSError:
        pass


if __name__ == "__main__":
    import asyncio
    import json
    import sys

    question = " ".join(sys.argv[1:]) or "What hoodies do you have under $70?"
    print(json.dumps(asyncio.run(run_agent(question)), indent=2))

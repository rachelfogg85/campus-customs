# Usability Improvements — Problem 9

Four improvements: two frontend, two backend/agent. Each one below says what
was added, why it helps a shopper or the business, and how it was verified
in the actual running app (not just read from the code).

---

## Frontend 1 — A real mobile navigation menu

**What I added.** Before this, the nav bar (brand, Home/Products/About Us,
Log in/Create an Account) was a single non-wrapping flex row. I measured it
on an actual 375px-wide viewport before touching anything: the five items
total ~555px, so on any phone-width screen the row overflowed — links got
squeezed, wrapped mid-word ("About" / "Us" on separate lines), and the
auth buttons were pushed toward the edge of the screen. I added a hamburger
button (`NavBar.tsx`) that appears only below 760px, toggling a dropdown
panel with all the same links stacked vertically; the menu auto-closes when
a shopper actually navigates (`useLocation` effect), so it never gets left
open over the next page. Above 760px, the nav looks and behaves exactly as
before — nothing changed for desktop. While in there, I also fixed the
Products page's search+filter toolbar, which had the same problem for a
different reason: the garment-type `<select>` sizes itself off its longest
option text ("long-sleeve performance shirt"), which doesn't fit next to a
search box on a narrow screen — it now stacks vertically under 560px.

**Why it helps.** A usability feature a shopper can't actually reach because
the buttons are cut off isn't a usability feature — it's broken navigation.
A lot of campus shopping happens on a phone between classes; a nav bar that
visibly breaks on the first screen a mobile visitor sees is the kind of
first impression that loses a sale before the shopper ever reaches a
product. This is a case where "looks better" and "is usable at all" are the
same fix.

**Verified live:** resized the browser pane to a phone-width viewport,
confirmed the pre-fix overflow (nav text wrapping mid-word, auth buttons cut
off), then confirmed post-fix: hamburger icon appears, tapping it opens a
full-width dropdown with every link and the correct logged-in/guest auth
state, and tapping "Products" both navigates and closes the menu.

---

## Frontend 2 — Sort, low-stock filter, and urgency badges on Products

**What I added.** The Products page's toolbar (`Products.tsx`) gained a
**Sort** control (Featured / Price: Low to High / Price: High to Low) and a
**Low stock only** checkbox. `ProductCard.tsx` now shows an amber "Only N
left" badge on any product whose total stock across all sizes is at or
below a threshold (20 units — chosen by checking the actual distribution in
`campus_customs.db`, where this flags a meaningful minority of the catalog
rather than almost everything). The checkbox filters to exactly that same
set, using the one exported constant so the badge and the filter can never
disagree with each other.

I originally built this as a generic "In stock only" toggle, then actually
tested it: querying the database showed **zero** products are sold out
across every size at once, so that toggle would always show all 102 items
and look broken to anyone who clicked it. I caught this by testing, not by
assumption, and swapped it for "Low stock only," which does something real.

**Why it helps.** Sorting by price lets a budget-conscious student go
straight to what they can afford instead of scrolling all 102 items. The
low-stock badge and filter do double duty: for the shopper, it's an honest
signal ("if you want this, don't wait") that's directly backed by the real
`inventory` table, not a manufactured gimmick; for the business, surfacing
near-sold-out items is a standard, legitimate way to move inventory that's
about to disappear rather than let it quietly run out unnoticed.

**Verified live:** set sort to "Price: Low to High" and confirmed the grid
reordered from cheapest ($32 tees) up. Checked "Low stock only" and
confirmed the grid went from 102 cards to exactly 4 — Football Left Chest T
Shirt, Soccer Left Chest Crewneck, T Felt Y Heavyweight, and Tri Blend
Sports Hockey T Shirt — each showing its real "Only N left" count, matching
the badge shown on the same cards with the filter off.

---

## Backend 1 — One shared agent instead of rebuilding per message (faster/cheaper)

**What I added.** Before this, every single `/api/chat` call ran
`build_agent()` from scratch: a new `httpx.AsyncClient` (a fresh TCP+TLS
handshake out to Portkey), a new `Agent`, and re-ran all the
`@agent.tool`/`@agent.instructions` registrations — on top of wrapping the
whole thing in `asyncio.run(...)`, which spins up and tears down an entire
event loop just to make one network call. None of that per-request
reconstruction was necessary: the only thing that's actually different
between requests is the `Deps` object (who's chatting, what they asked),
which was already created fresh every time. I put `@lru_cache(maxsize=1)` on
`build_agent()` so the `Agent` and its HTTP connection pool are built once
per server process and reused, and changed `/api/chat` and `run_agent` to
be properly `async def` so requests share one real event loop — which is
what makes reusing the client *safe*, not just faster (an `httpx.AsyncClient`
built in one `asyncio.run()` can't be reused in a later one without risking
a "different event loop" error).

**Why it helps.** Every repeat message in a conversation now skips a TCP/TLS
handshake and skips rebuilding the same tool registrations — less latency
per reply for the shopper, and less redundant setup work per request for
the server. This is a backend/infrastructure correctness-and-speed fix, not
a one-off hack: it's the normal pattern for a production FastAPI + HTTP
client service.

**Verified:** sent two separate chat requests back to back, confirmed both
returned correct, tool-grounded answers with no "attached to a different
event loop" error (the specific failure mode this would hit if the
async/caching change were done incorrectly) — see the transcript in this
session's work. `uvicorn`'s `--reload` log also confirms the server
survives repeated requests across process reloads without errors.

---

## Backend 2 — A code-level guardrail against ungrounded price/stock claims (safer/more accurate)

**What I added.** The system prompt already instructs the agent to never
answer a price or stock question without calling a tool, and in testing it
reliably does. This improvement is the backstop for the rare case that
instruction doesn't hold. `run_agent()` now checks the agent's final reply
against `_claims_product_facts_without_tools()`: a pattern match for
price-shaped text (`$32`), categorical stock claims ("in stock", "out of
stock", "sold out"), or quantified ones ("5 left", "12 available") —
*combined with* an empty `tool_names` list for that turn (the real record of
which tools actually ran, not anything the model self-reports). If both are
true, the reply is replaced with an honest "let me actually check that"
message instead of being sent to the shopper. This is a code-level check
that runs after generation, independent of whatever the model was told to
do — it can't be prompt-injected or reasoned around the way an instruction
embedded in the system prompt theoretically could be, because it doesn't
read the model's words as instructions at all, only as text to pattern
-match and a boolean fact (did a tool run) to check.

**Why it helps.** This is the single most repeated requirement across the
whole assignment — "never invent a price or quantity" — and until now it
existed only as a prompt instruction, which models can occasionally fail to
follow. Defense in depth matters here specifically because the business
cost of a wrong answer is concrete: a shopper told something is in stock
when it isn't (or at a price it doesn't sell for) is a trust problem, not
just a chat quality problem.

**Verified:** this backstop is for a failure mode the system prompt already
prevents in normal operation, so reliably forcing the live model to trigger
it isn't a meaningful test (a flaky, contrived demo would prove less than a
direct check). Instead I unit-tested
`_claims_product_facts_without_tools()` directly against six cases: three
ungrounded claims with no tool calls (correctly flagged), the same price
claim *with* a tool call recorded (correctly allowed through), and two
benign tool-free replies — a greeting and a shipping-policy line mentioning
neither a price nor a stock phrase (correctly left alone, confirming the
pattern doesn't over-trigger on ordinary conversation). All six passed.

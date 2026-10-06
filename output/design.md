# Design — Problem 10: Style the Website

Three asks: a bigger, catchier headline font; a Yale-blue-and-white palette;
and consistent, trimmed-down product cards. Each one below says exactly what
changed and where.

---

## Font — big, thick, catchy headline type

**What changed.** Added **Archivo Black** (Google Fonts, weight 900, the
only weight it ships in) as a new `--font-display` CSS variable
(`frontend/src/index.css`), loaded via a `<link>` in `index.html`. It's
applied to:

- Every page's `<h1>` globally (one rule in `index.css`, so Home's hero,
  Products' "Products", the product detail page's product name, About,
  Login, and Signup all get it automatically and consistently — not a
  one-off on the homepage).
- The nav wordmark, "Campus Customs" (`.nav__wordmark` in `App.css`).

**What didn't change.** Body copy, product card text, and form labels stay
on the existing `--font-sans` (Inter). The brief asked for type people
*notice* — headlines and the logo — not for the whole site to be set in a
heavy display face, which would work against the "simple and clean" product
browsing also asked for in this same problem. Two type treatments with one
clear job each (display = impact, sans = reading) reads more intentional
than one face doing both badly.

**Verified live:** Home's hero headline, the Products/About/Login/Signup
page headings, a short product name (Benjamin Franklin 1/4 Zip — fits one
line), and a long one (Hype And Vice Yale University Offside Crewneck —
wraps cleanly to two lines, no overflow) all render in the new display
font at the correct weight.

**Follow-up (same problem, next round of feedback):** the first pass left
every `<h1>` in its default near-black ink color, which read as "a heavy
black display font" rather than "Yale's own bold headline type." Changed
the global `h1` rule's `color` to `var(--yale-blue)` — same font, same
weight, same size, now rendered in brand blue instead of near-black.
Verified on the Home hero and the Products page heading.

---

## Colors — Yale blue and white

**What changed:** nothing new here — the site was already restyled to a
white background with Yale-blue accents (`#00356b` / `#286dc0`) in an
earlier pass this session. For Problem 10 I audited every literal color
value across `index.css` and `App.css` to confirm nothing had drifted:

| Color | Used for |
|---|---|
| `--yale-blue` `#00356b` | Buttons, links, nav mark, prices, active states |
| `--yale-blue-light` `#286dc0` | Hover states, lighter accents |
| White / near-white (`--bg`, `--surface`, `--surface-raised`) | Backgrounds, cards |
| Neutral grays (`--ink`, `--ink-soft`, `--ink-faint`, `--line`) | Text and borders — not a "color," but needed for anything to be readable on white |

**The one deliberate exception:** `--warn` (amber, the "Only N left" badge)
and `--danger` (red, out-of-stock/error states). These are left as
functional status colors rather than forced into blue, because a stock
warning that's the same color as every button and link on the page stops
reading as a warning — the whole point of the low-stock badge (Problem 9)
is that it's visually distinct enough to notice. Brand chrome is
blue-and-white; alerts use color the way shoppers already expect alerts to.

---

## Product presentation — consistent, trimmed cards

**What changed** (`ProductCard.tsx` + its CSS in `App.css`), applied to the
single shared `ProductCard` component — meaning this is automatically
consistent everywhere a product card appears: the Products grid, Home's
"Fresh off the shelf," and the chat's "From your chat" results shelf.

- **Title: exactly one line, always.** `white-space: nowrap; overflow:
  hidden; text-overflow: ellipsis` — a long name like "2025 Yale Vs Harvard
  T Shirt" truncates with "…" instead of wrapping and pushing the rest of
  the card's layout around. The full name is still available as a native
  tooltip (`title=` attribute) on hover.
- **Description: capped at two lines, always.** Previously this was only
  trimmed to ~90 characters in JavaScript, which could still wrap to a
  different number of lines depending on the card's actual width. Added a
  CSS `-webkit-line-clamp: 2` so it's a hard two-line limit regardless of
  viewport, plus a shorter 80-character JS trim as a sensible floor.
- **Garment type: truncates instead of wrapping.** The footer row (price +
  garment type) now keeps the price fixed-width and lets the type label
  ellipsis on overflow, so a long type like "Quarter-Zip Pullover
  Sweatshirt" can't force the price/type row onto two lines and break the
  card's height.
- **Net result per card: image, one-line title, up to two lines of
  description, one price line.** Every card in the catalog now has the same
  shape, so scanning the grid is about comparing products, not parsing
  cards of different heights and lengths.

**Verified live:** checked the Products grid at 4-up — every card bottom
-aligns at the price row regardless of how long that product's name or
description is, confirmed a genuinely long title (e.g. "Baseball Left Chest
Crewneck") truncates with an ellipsis instead of wrapping.

**Follow-up — image framing.** A second look at the grid turned up a real
inconsistency the card-text work didn't touch: `.product-card__image img`
was set to `object-fit: cover`, which fills the square box by cropping
whatever doesn't fit — fine for a photo framed to match, but the catalog's
102 source photos aren't all framed the same way, so one product's hoodie
showed full-length while another got cropped at the collar in an
identically-sized box. Switched to `object-fit: contain` with a little
internal padding: every photo now shows the *entire* garment, letterboxed
on the same neutral background when its proportions don't fill the square,
instead of an inconsistent crop. This fixes framing consistency, which is
what was actually visible as "inconsistent"; it can't fix the source photos
themselves having different backdrop colors (some shot on black, some on
white) — that's baked into the provided product images, not something CSS
changes.

**Renames, same round:** nav + hero button "Shop" → **"Shop All"**; Home's
featured-products heading "Fresh off the shelf" → **"New to our
collection"**; that section's "See everything →" link → **"Shop All →"**,
so every path to the catalog uses the same label.

**Verified live:** searched the Products grid for "fencing" — the Fencing
Left Chest Hoodie, previously cropped at the hood in the screenshot that
prompted this fix, now shows the complete garment hood-to-hem inside the
same box size as every other card.

**Copy follow-up — the "Ask Before You Buy" banner.** Across this round of
feedback the banner (added in Problem 9, then refined into its current
side-by-side layout with an in-banner "Chat with us" button) also got a
final copy pass: the body line went from "We check real stock before we
answer — no guessing" to **"Connect with us before committing — know
everything you need before buying."** Kept to one line, and deliberately
doesn't repeat the words "chat with us" — the button sitting right next to
the sentence already says that, so the copy's job is to say *why*, not
repeat the button's own label back at the shopper.

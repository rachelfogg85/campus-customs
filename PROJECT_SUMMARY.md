# Campus Customs — What We Built, in Plain English

This is a non-technical walkthrough of HW4, problem by problem. For the
technical deep-dive, see `output/harness.md` (how the system works),
`output/design.md` (visual design decisions), `output/usability.md`
(usability improvements), and `output/app_check.html` (screenshots proving
it actually works). This document is just "what happened and why it
mattered," in regular language.

**The big picture:** we built a real-feeling online store for Yale apparel
— browse products, create an account, and chat with an AI shopping
assistant — and the whole project was about making sure that assistant
never lies about price or stock. Everything it says is pulled from a real
local database, live, every time.

---

### Problem 1 — Deciding what to build

We wrote down the vision: a store where shoppers can browse products,
create accounts, and chat with an AI assistant that gives honest price and
stock answers from a real database — not guesses. You also gave us the raw
materials: a database file with the product catalog and inventory, plus a
folder of product photos.

### Problem 2 — Understanding the data we were given

Before building anything, we opened up the database and documented exactly
what was in it: a `catalogue` table (every product's name, description,
price, photo), an `inventory` table (how many of each size are in stock),
a `users` table (accounts), and a `chat_messages` table (conversation
history). This became `output/harness.md`'s foundation — knowing what data
existed shaped everything built afterward.

### Problem 3 — Building the actual website

This is where the site became visible: a homepage, a "Shop All" page
showing every product as a card (image, name, price), a page for each
individual product, and a floating chat bubble in the corner. The chat
bubble didn't talk to a real AI yet — it was wired up but just echoed a
placeholder reply, so the plumbing worked before the "brain" was added.

### Problem 4 — Accounts you can actually create and log into

Added real sign-up and login. The important part: passwords are never
stored as plain text. They're run through a one-way scrambling process
(called hashing) before touching the database, so even someone with direct
access to the database file couldn't read anyone's actual password — not
even us.

### Problem 5 — Turning on the chatbot's brain

This is where the chat bubble got connected to an actual AI model for the
first time, with a written "personality" (a system prompt) telling it how
to sound like a friendly Campus Customs employee and, critically, to never
make up a price or stock number.

### Problem 6 — Giving the AI real lookup abilities

An AI model on its own can only guess. We gave it specific, narrow
abilities ("tools"): search the catalog, look up one product's details, and
check exact stock by size — including understanding that "medium," "M,"
and "m" all mean the same thing. Every price or stock answer the chatbot
gives has to come from one of these real lookups.

### Problem 7 — The page reacts to what you ask

Before this, the chatbot could only describe products in text. Now, if you
ask something like "what hoodies do you have?", the matching products
actually appear on the page as clickable picture cards — the same cards you
see browsing normally, clickable into the same product pages.

### Problem 8 — The chatbot remembers you

If you're logged in, the assistant knows your name and reloads your past
conversation when you come back, instead of starting over every time. It
also knows which product page you're currently looking at, so you can ask
"is this in stock in a large?" without repeating the product's name.

### Problem 9 — Making it nicer to use (both sides)

Two kinds of polish: on the site itself, a working mobile menu (it was
visibly broken on phone-sized screens before this), a way to sort products
by price, and "only 9 left" urgency badges. Behind the scenes, we made the
chatbot faster/cheaper to run (it was rebuilding its own setup from scratch
on every single message before this — wasteful), and added a safety net
that catches the rare case where the AI might state a price or stock number
without actually having looked it up.

This look-and-feel work kept going well past the original Problem 9 pass,
as you gave feedback on the live site. That included a **shopping cart**
(add to cart with size and quantity, a cart page, quantities checked
against real stock), several rounds of **copy and layout tweaks** (button
labels, banner wording, the "Ask Before You Buy" section, the floating chat
button becoming more visible), and a **cleanup of the product filter
dropdown** (22 near-duplicate categories like "crewneck" and "crewneck
sweatshirt" consolidated into about 7 real categories shoppers would
actually browse by).

### Problem 10 — Giving it a consistent look

The site got a real visual identity: bold Yale-blue headlines in a chunky
display font, a bulldog-mascot logo (not Yale's official trademarked seal —
that's not ours to use), and cleaner product cards (one-line titles, short
descriptions, consistent photo framing) so browsing feels tidy instead of
cluttered.

### Problem 11 — Actually testing it, and finding a real bug

We tested three things end-to-end with real screenshots: the chatbot giving
an honest stock/price answer, the page updating with matching products
after a question, and one of the Problem 9 usability features. Testing
this for real actually caught a genuine bug — asking "what hoodies do you
have?" (plural) returned zero results because the catalog only ever says
"hoodie" (singular), and the search was too literal to notice they're the
same word. We fixed it and re-verified.

### Problem 12 — A permanent paper trail, and more safety rules

Added a file (`output/audit_trail.json`) that permanently logs every single
thing the chatbot does — what was asked, which lookup tools it used, what
they returned, and why the conversation ended — and this file only ever
grows, never gets erased. We also added explicit rules so the assistant can
never invent a discount or coupon, can never look up another shopper's
information, and can't fill in gaps in product info (like fabric care)
using general internet-style knowledge instead of admitting the catalog
doesn't say.

### Problem 13 — Publishing it to GitHub

Took the whole project and put it on GitHub (a public code-hosting site) so
anyone can view or download it. The real database, the real product
photos, and the secret API key all stayed off of GitHub on purpose — a
`.gitignore` file tells the system to skip them, and an `.env.example` file
shows what a key *would* look like without including a real one. Anyone who
downloads the project has to supply their own copy of the data and their
own API key to run it.

---

### Where things stand now

A working demo storefront with real accounts, a real cart, and a chat
assistant that's been tested, documented, and safety-checked — published on
GitHub with the sensitive stuff deliberately left out.

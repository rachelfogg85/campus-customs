# Campus Customs

A Yale apparel storefront with a pydantic-ai shopping assistant: shoppers
browse products, create an account, and chat with an agent that answers
price/stock questions and finds matching items — grounded entirely in a
real local SQLite database, never invented.

- **Frontend:** React + Vite + TypeScript
- **Backend:** FastAPI + pydantic-ai, model served via Portkey (`gpt-6-astra`)
- **Data:** SQLite (`campus_customs.db`) with a product catalogue, live
  inventory, user accounts, chat history, and cart items

See `output/harness.md` for the full technical reference (models, tools,
safety rules, specs), `output/design.md` for the visual design decisions,
`output/usability.md` for the usability improvements, and
`output/app_check.html` (open directly in a browser) for a screenshot-backed
test of the live app.

## 1. Get the data pack

This repo does **not** include the real database or product photos — they're
provided separately as a data pack. Place it at `data/` in the repo root so
it looks like this:

```
hw4/
└── data/
    ├── campus_customs.db
    └── products/        # product photos referenced by the catalogue
```

Nothing will run without this folder in place.

## 2. Backend setup

From the repo root (`hw4/`):

```bash
python3 -m venv backend/.venv
source backend/.venv/bin/activate
pip install -r requirements.txt
```

Copy `.env.example` to `.env` (repo root) and fill in your own key:

```bash
cp .env.example .env
```

```
PORTKEY_API_KEY=your-key-here
MODEL_NAME=gpt-6-astra
PORTKEY_BASE_URL=https://api.portkey.ai/v1
```

`.env` is read from the repo root, from `backend/.env`, or (for the course
environment this project started in) one folder above — put it wherever is
convenient; all three locations work.

Run the API (with the venv still active):

```bash
cd backend
uvicorn main:app --reload --port 8000
```

- API: http://127.0.0.1:8000
- Interactive docs: http://127.0.0.1:8000/docs

Without a valid `PORTKEY_API_KEY`, every other route (products, accounts,
cart) still works — only `/api/chat` degrades, returning a clear
"PORTKEY_API_KEY is missing" message instead of a real agent reply.

## 3. Frontend setup

In a second terminal, from the repo root:

```bash
cd frontend
npm install
npm run dev
```

- Site: http://127.0.0.1:5174

The frontend talks to the backend at `http://127.0.0.1:8000` by default
(`frontend/.env.local`, if present, can override this via `VITE_API_BASE`).

## Project layout

```
hw4/
├── AI_prompts.md          # every prompt typed during this project, verbatim
├── requirements.txt
├── .env.example
├── README.md
├── frontend/              # React + Vite + TypeScript app
├── backend/
│   ├── main.py            # FastAPI app — run with: uvicorn main:app --reload --port 8000
│   ├── db.py              # all SQLite access
│   ├── auth.py            # password hashing (signup/login)
│   ├── agent.py           # the agent — builds and runs it
│   ├── tools.py           # the agent's tools (search, product info, stock)
│   ├── models.py          # the agent's Pydantic/PydanticAI structured types
│   └── prompts/
│       └── prompt.md      # the agent's system prompt
└── output/
    ├── harness.md          # full system reference: models, tools, safety, specs
    ├── design.md           # visual design decisions
    ├── usability.md        # Problem 9 usability improvements
    ├── app_check.html      # screenshot-backed test of the live app (open directly)
    ├── app_check_images/   # screenshots linked from app_check.html
    └── audit_trail.json    # append-only log of every agent run

data/                       # NOT in git — see "Get the data pack" above
├── campus_customs.db
└── products/
```

The agent itself is exactly four files, all under `backend/`:
`prompts/prompt.md`, `agent.py`, `tools.py`, and `models.py`. `main.py`,
`db.py`, and `auth.py` are the surrounding API/data-access layer the agent
runs inside, not part of the agent.

# InsightFlow Monorepo

InsightFlow combines a FastAPI backend with a Vite/React frontend to help teams collect research, synthesize insights, and drive evidence-based decisions.

## Monorepo layout

- `apps/api`: FastAPI application with SQLAlchemy models, REST endpoints, and export utilities
- `apps/web`: Vite + React + TypeScript frontend styled with Tailwind and shadcn-inspired components
- `data/app.db`: SQLite database file (created on first run)
- `data/uploads/`: Uploaded documents and extracted text snapshots

## Prerequisites

- Python 3.10+
- Node.js 18+

## Backend setup

```bash
cd apps/api
python -m venv .venv
source .venv/bin/activate  # On Windows use `.venv\Scripts\activate`
pip install -r requirements.txt

# optional: seed sample data
python -m scripts.seed

# start the API (http://localhost:8000)
uvicorn app.main:app --reload
```

The API exposes health and application routes such as:

- `GET /projects`, `POST /projects`
- `GET /sources`, `POST /sources` (multipart upload of PDF/MD/TXT)
- `POST /insight-runs`, `GET /insight-runs/{id}` (mocked insight generation)
- `GET /themes`, `GET /claims`
- `GET/POST /decisions`
- `GET/POST /tasks`
- `GET /export/{project_id}.md` for markdown summaries

Uploads are saved under `data/uploads`, and extracted text pointers are stored in the database.

## Frontend setup

```bash
cd apps/web
npm install
npm run dev  # Vite dev server on http://localhost:5173
```

The app assumes the API is running on `http://localhost:8000`. Adjust `VITE_API_URL` in a `.env` file inside `apps/web` if needed.

## Frontend features

- Command palette (`⌘K` / `Ctrl+K`) with quick actions
- Keyboard shortcuts: `N` new project, `U` upload source, `A` analyze, `D` log decision, `T` add task
- Project dashboard, source library, insight runs viewer, decision canvas, and task board routes
- React Query for data fetching and cache, Zustand for UI state, Tailwind UI primitives for minimalist cards and drawers

## Data & persistence

- SQLite database stored at `data/app.db`
- Uploaded documents (and extracted text) in `data/uploads`
- Seed script populates a sample project, sources, decision, and tasks

## Exporting insights

Use the export endpoint to pull a Markdown report:

```bash
curl http://localhost:8000/export/<project_id>.md
```

Includes themes, claims (with footnote citations), decisions, and tasks.

## Useful commands

- Backend: `uvicorn app.main:app --reload`
- Frontend: `npm run dev`
- Lint (frontend): `npm run lint`

Both servers support hot reload for a smooth development experience.


# InsightFlow Mock Demo Pack (v1)

Use this pack to **close the MVP** by demonstrating InsightFlow’s USP: turning unstructured sources into **themes → claims (with citations) → decisions → tasks**, then exporting a report.

## Contents
- `sources/` — Markdown sources to upload or import
- `fixtures/` — JSON payloads to return from `/api/insight-runs` in demo mode
- `expected_exports/` — Example Markdown reports the app should generate

## How to Use
1. Set `DEMO_MODE=1` in your API environment.
2. Implement a loader that, when `DEMO_MODE=1`, serves the JSON in `fixtures/` when `/api/insight-runs` is called.
3. Upload the corresponding `sources/*.md` via the UI to simulate citations.
4. Generate decisions and tasks from the claims; then **Export Markdown** and compare to `expected_exports/*`.

## FastAPI Demo Mode (Codex Prompt)
“Add a `DEMO_MODE` env var. If set, `POST /api/insight-runs` reads a JSON file from `/mnt/data/insightflow-mockpack-v1/fixtures/` by scenario name (e.g., `scenario1_market_scan.json`) and returns it as the run payload with a fresh run_id. Also add `POST /api/demo/select` to set the current scenario.”

### Suggested Endpoints
- `POST /api/demo/select` → `{ "scenario": "scenario1_market_scan" }`
- `POST /api/insight-runs` → returns payload from selected scenario
- `GET /api/insight-runs/{id}` → returns stored payload

## Frontend Demo Controls (Codex Prompt)
“Add a ‘Demo’ dropdown in the top bar with options: Market Scan, Technical RFC, Sleep Support. Selecting one calls `POST /api/demo/select`. The Analyze button then uses that scenario for the next run. Add a small ‘Demo Mode’ badge if `DEMO_MODE=1`.”

## Export Comparison (Codex Prompt)
“After a run and a saved decision with tasks, implement Export Markdown. Compare exported content to `expected_exports/scenarioX_expected.md` (approximate match: check headings and footnotes exist). Add a ‘Compare with Expected’ button in dev mode that diffs the current export against the file.”

## Testing Strategy Prompts
- **API Unit Test** — “If `DEMO_MODE=1` and scenario is set to `scenario2_rfc_vector`, POST `/api/insight-runs` returns JSON with exactly 2 themes; assert claims presence and citation structure.”
- **UI Test** — “Render `InsightRunViewer`, trigger Analyze, assert rendered theme titles and claim texts; open evidence drawer.”
- **E2E** — “Scenario 1: Upload 2 sources, select Market Scan, Analyze, create decision, add 2 tasks, export Markdown, assert footnotes present.”

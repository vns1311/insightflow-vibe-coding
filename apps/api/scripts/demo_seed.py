"""Seed or clean InsightFlow demo data with fixture content.

Usage:
    python -m scripts.demo_seed load [--scenario scenario1_market_scan|scenario2_rfc_vector|scenario3_sleep_notes|all]
    python -m scripts.demo_seed cleanup [--scenario scenario1_market_scan|scenario2_rfc_vector|scenario3_sleep_notes|all]

Examples:
    # Load every demo scenario
    python -m scripts.demo_seed load

    # Load only the technical RFC scenario
    python -m scripts.demo_seed load --scenario scenario2_rfc_vector

    # Remove all demo projects and uploaded files
    python -m scripts.demo_seed cleanup --scenario all
"""
from __future__ import annotations

import argparse
import json
import shutil
import uuid
from pathlib import Path
from typing import Iterable, List

from sqlalchemy.orm import Session

from app import models
from app.database import DATA_DIR, SessionLocal

FIXTURE_DIR = DATA_DIR / "demo" / "fixtures"
SOURCE_DIR = DATA_DIR / "demo" / "sources"
UPLOAD_DIR = DATA_DIR / "uploads"

SCENARIOS = {
    "scenario1_market_scan": {
        "project_name": "Demo – Market Scan",
        "description": "Market scan of AI-focused productivity tools highlighted in the demo pack.",
        "sources": {
            "SRC_MARKET_ARTICLE": "MarketScan_Article.md",
            "SRC_MARKET_NOTES": "MarketScan_Notes.md",
        },
    },
    "scenario2_rfc_vector": {
        "project_name": "Demo – Technical RFC",
        "description": "Technical RFC outlining vector search enhancements for the product.",
        "sources": {
            "SRC_RFC_TRADEOFFS": "RFC_Tradeoffs.md",
            "SRC_RFC_VECTOR": "RFC_Vector_Search.md",
        },
    },
    "scenario3_sleep_notes": {
        "project_name": "Demo – Sleep Support",
        "description": "Sleep hygiene insights compiled from personal notes and research.",
        "sources": {
            "SRC_SLEEP_NOTES": "SleepSupport_Notes.md",
            "SRC_SLEEP_ARTICLE": "SleepSupport_Article.md",
        },
    },
}

LEGACY_PROJECT_NAMES = {"InsightFlow Demo Project"}


def resolve_scenarios(selection: str) -> List[str]:
    if selection == "all":
        return list(SCENARIOS.keys())
    if selection not in SCENARIOS:
        raise ValueError(f"Unknown scenario '{selection}'. Choose from {list(SCENARIOS)} or 'all'.")
    return [selection]


def remove_project(session: Session, project: models.Project) -> None:
    for source in list(project.sources):
        for path_value in (source.uri, source.content_ptr):
            if not path_value:
                continue
            file_path = Path(DATA_DIR.parent, path_value)
            if file_path.exists():
                file_path.unlink(missing_ok=True)
    session.delete(project)


def cleanup(session: Session, scenario_ids: Iterable[str]) -> None:
    target_names = {SCENARIOS[s]["project_name"] for s in scenario_ids}
    target_names.update(name for name in LEGACY_PROJECT_NAMES)

    projects = (
        session.query(models.Project)
        .filter(models.Project.name.in_(target_names))
        .all()
    )
    if not projects:
        print("No matching demo projects found to clean up.")
        return

    for project in projects:
        remove_project(session, project)
    session.commit()
    print(f"Removed {len(projects)} demo project(s).")


def load_fixture(scenario_id: str) -> dict:
    fixture_path = FIXTURE_DIR / f"{scenario_id}.json"
    if not fixture_path.exists():
        raise FileNotFoundError(f"Missing fixture file: {fixture_path}")
    return json.loads(fixture_path.read_text(encoding="utf-8"))


def copy_source_files(source_map: dict[str, str]) -> dict[str, models.Source]:
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    sources: dict[str, models.Source] = {}
    for source_id, filename in source_map.items():
        source_path = SOURCE_DIR / filename
        if not source_path.exists():
            raise FileNotFoundError(f"Missing demo source file: {source_path}")

        dest_file = UPLOAD_DIR / f"{source_id}{source_path.suffix.lower()}"
        shutil.copyfile(source_path, dest_file)

        text_path = UPLOAD_DIR / f"{source_id}.txt"
        text_path.write_text(source_path.read_text(encoding="utf-8"), encoding="utf-8")

        sources[source_id] = models.Source(
            id=source_id,
            kind="document",
            title=filename.replace("_", " ").replace(".md", ""),
            uri=str(dest_file.relative_to(DATA_DIR.parent)),
            content_ptr=str(text_path.relative_to(DATA_DIR.parent)),
            tags=[],
        )
    return sources


def load_scenario(session: Session, scenario_id: str) -> None:
    config = SCENARIOS[scenario_id]

    existing = (
        session.query(models.Project)
        .filter(models.Project.name == config["project_name"])
        .first()
    )
    if existing:
        remove_project(session, existing)
        session.commit()

    project = models.Project(name=config["project_name"], description=config["description"])
    session.add(project)
    session.flush()

    source_models = copy_source_files(config["sources"])
    for source in source_models.values():
        source.project_id = project.id
        session.add(source)
    session.flush()

    fixture = load_fixture(scenario_id)
    run = models.InsightRun(project_id=project.id, status="completed")
    session.add(run)
    session.flush()

    payload_themes: list[dict] = []

    for theme_entry in fixture.get("themes", []):
        theme_id = str(uuid.uuid4())
        theme = models.Theme(
            id=theme_id,
            insight_run_id=run.id,
            title=theme_entry.get("title", "Theme"),
            summary=theme_entry.get("summary"),
            confidence=theme_entry.get("confidence", 0.0),
        )
        session.add(theme)
        session.flush()

        payload_claims: list[dict] = []
        for claim_entry in theme_entry.get("claims", []):
            claim_id = str(uuid.uuid4())
            statement = claim_entry.get("statement") or claim_entry.get("text") or ""
            claim = models.Claim(
                id=claim_id,
                theme_id=theme.id,
                statement=statement,
                confidence=claim_entry.get("confidence", 0.0),
            )
            session.add(claim)
            session.flush()

            citation_payloads: list[dict] = []
            for citation_entry in claim_entry.get("citations", []):
                source_key = citation_entry.get("source_id")
                source_model = source_models.get(source_key)
                if not source_model:
                    continue
                quote = None
                start = citation_entry.get("start")
                end = citation_entry.get("end")
                content_path = Path(DATA_DIR.parent, source_model.content_ptr)
                if content_path.exists() and isinstance(start, int) and isinstance(end, int):
                    text = content_path.read_text(encoding="utf-8")
                    if 0 <= start < end <= len(text):
                        quote = text[start:end]
                citation = models.Citation(
                    id=str(uuid.uuid4()),
                    claim_id=claim.id,
                    source_id=source_model.id,
                    quote=quote,
                    location=(f"offset {start}-{end}" if isinstance(start, int) and isinstance(end, int) else None),
                )
                session.add(citation)
                citation_payloads.append(
                    {
                        "id": citation.id,
                        "source_id": citation.source_id,
                        "quote": quote,
                        "location": citation.location,
                    }
                )

            payload_claims.append(
                {
                    "id": claim_id,
                    "statement": statement,
                    "confidence": claim_entry.get("confidence", 0.0),
                    "citations": citation_payloads,
                }
            )

        payload_themes.append(
            {
                "id": theme_id,
                "title": theme_entry.get("title", "Theme"),
                "summary": theme_entry.get("summary"),
                "confidence": theme_entry.get("confidence", 0.0),
                "claims": payload_claims,
            }
        )

    run.payload = {"themes": payload_themes}
    session.add(run)
    session.commit()
    print(f"Loaded demo scenario '{scenario_id}' into project '{project.name}'.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed or clean demo data.")
    parser.add_argument("action", choices=["load", "cleanup"], help="Whether to load or cleanup demo artifacts.")
    parser.add_argument(
        "--scenario",
        choices=["all", *SCENARIOS.keys()],
        default="all",
        help="Scenario identifier to target (default: all).",
    )
    args = parser.parse_args()

    scenario_ids = resolve_scenarios(args.scenario)

    with SessionLocal() as session:
        if args.action == "cleanup":
            cleanup(session, scenario_ids)
        else:
            for scenario_id in scenario_ids:
                load_scenario(session, scenario_id)


if __name__ == "__main__":
    main()

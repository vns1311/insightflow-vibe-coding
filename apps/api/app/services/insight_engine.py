import uuid
from itertools import cycle
from typing import Iterable, List

from .. import models


def generate_mock_payload(project: models.Project, sources: Iterable[models.Source]) -> dict:
    source_list: List[models.Source] = list(sources)
    source_cycle = cycle(source_list) if source_list else None

    theme_templates = [
        {
            "title": "Adoption momentum is building",
            "summary": "Teams expand pilots into production while engagement metrics trend upward.",
            "confidence": 0.82,
            "claims": [
                "Expansion teams increased license counts across three regions.",
                "Usage sessions climbed 35% quarter-over-quarter for early adopters.",
                "Customer champions cite faster onboarding and clearer dashboards.",
            ],
        },
        {
            "title": "Enablement friction remains a risk",
            "summary": "Operational gaps slow wider rollout and require enablement focus.",
            "confidence": 0.74,
            "claims": [
                "Implementation playbooks differ between regions, creating delays.",
                "Data integrations still rely on manual exports for weekly reporting.",
                "Executives want clearer ROI visualization before scaling budget.",
            ],
        },
    ]

    themes_payload: list[dict] = []
    for theme_template in theme_templates:
        theme_id = str(uuid.uuid4())
        claims_payload: list[dict] = []

        for claim_text in theme_template["claims"]:
            claim_confidence = max(theme_template["confidence"] - 0.08, 0.5)
            citations_payload = []

            # attach up to two supporting sources per claim
            if source_cycle is not None:
                for _ in range(min(2, len(source_list))):
                    source = next(source_cycle)
                    citations_payload.append(
                        {
                            "id": str(uuid.uuid4()),
                            "source_id": source.id,
                            "quote": f"{source.title or source.kind} reference supporting “{claim_text[:40]}...”",
                            "location": source.uri,
                        }
                    )

            claims_payload.append(
                {
                    "id": str(uuid.uuid4()),
                    "statement": claim_text,
                    "confidence": claim_confidence,
                    "citations": citations_payload,
                }
            )

        themes_payload.append(
            {
                "id": theme_id,
                "title": theme_template["title"],
                "summary": theme_template["summary"],
                "confidence": theme_template["confidence"],
                "claims": claims_payload,
            }
        )

    return {"themes": themes_payload}

from __future__ import annotations

import hashlib
from pathlib import Path
from typing import Iterable, List, Tuple

import numpy as np

from .. import models
from ..database import DATA_DIR

try:
    import faiss  # type: ignore
except ImportError:  # pragma: no cover - optional dependency
    faiss = None  # type: ignore


EMBED_DIM = 64


def _text_from_source(source: models.Source) -> str:
    if not source.content_ptr:
        return ""
    file_path = Path(DATA_DIR.parent, source.content_ptr)
    if not file_path.exists():
        return ""
    return file_path.read_text(encoding="utf-8", errors="ignore")


def _hash_to_vec(text: str) -> np.ndarray:
    if not text:
        return np.zeros(EMBED_DIM, dtype="float32")
    tokens = text.lower().split()
    vec = np.zeros(EMBED_DIM, dtype="float32")
    for token in tokens[:512]:
        digest = hashlib.md5(token.encode("utf-8")).digest()
        for idx, byte in enumerate(digest[: EMBED_DIM // 4]):
            vec[(idx * 4) % EMBED_DIM] += byte / 255.0
    norm = np.linalg.norm(vec)
    if norm > 0:
        vec /= norm
    return vec.astype("float32")


class EmbeddingStore:
    def __init__(self, dimension: int = EMBED_DIM):
        self.dimension = dimension
        self.ids: list[str] = []
        self.vectors: list[np.ndarray] = []
        self.index = None
        if faiss:
            self.index = faiss.IndexFlatL2(dimension)  # type: ignore

    def rebuild(self, sources: Iterable[models.Source]) -> None:
        self.ids.clear()
        self.vectors.clear()
        if self.index:
            self.index.reset()  # type: ignore
        for source in sources:
            self.add_source(source)

    def add_source(self, source: models.Source) -> None:
        text = _text_from_source(source)
        vector = _hash_to_vec(text)
        self.ids.append(source.id)
        self.vectors.append(vector)
        if self.index:
            self.index.add(vector.reshape(1, -1))  # type: ignore

    def similar(self, query_text: str, top_k: int = 5) -> List[Tuple[str, float]]:
        if not self.ids:
            return []
        query_vec = _hash_to_vec(query_text)
        matrix = np.vstack(self.vectors)
        if self.index:
            distances, indices = self.index.search(query_vec.reshape(1, -1), min(top_k, len(self.ids)))  # type: ignore
            results = []
            for dist, idx in zip(distances[0], indices[0]):
                if idx == -1:
                    continue
                results.append((self.ids[idx], float(dist)))
            return results
        # fallback cosine similarity
        sims = matrix @ query_vec
        order = np.argsort(-sims)[:top_k]
        return [(self.ids[int(i)], float(1 - sims[int(i)])) for i in order]


embedding_store = EmbeddingStore()

# Demo Project – Insight Report (Scenario 2: Technical RFC)

## Themes
1. **Vector Search Plan** – Introduce FAISS-based semantic search over chunked sources. _(confidence 0.81)_
   - Claim: Chunk size of ~800–1000 tokens with ~200 overlap improves recall. [^1]
   - Claim: MiniLM embeddings provide fast, adequate quality for a personal corpus. [^2]

2. **API Surface** – Expose a /search endpoint to return top-k chunks with scores and snippet previews. _(confidence 0.79)_
   - Claim: Add a `/search` endpoint returning chunk_id, score, and preview snippet. [^3]

## Decision: Implement FAISS with MiniLM First
- Rationale: Strong balance of speed/quality; supports personal-scale corpora.
- Pros: Low latency; easier setup; good recall with chunk overlap.
- Cons: Less accurate than larger models; requires local index management.
- Risk: Index drift if chunking strategy changes.
- Confidence: 0.78
- Next Actions:
  - [ ] Implement chunker + embedding persistence.
  - [ ] Build FAISS index and `/search` endpoint.
  - [ ] Add UI search bar with snippet previews.

## References
[^1]: RFC_Tradeoffs.md
[^2]: RFC_Tradeoffs.md
[^3]: RFC_Vector_Search.md

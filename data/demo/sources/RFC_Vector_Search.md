# Source: RFC_Vector_Search.md
Goal: Add local semantic search via FAISS. Steps:
1) Chunk documents to ~800-1000 tokens
2) Compute embeddings (MiniLM) and persist
3) Build a FAISS index and serve /search

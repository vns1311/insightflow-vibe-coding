import io
from pathlib import Path

try:
    from PyPDF2 import PdfReader
except ImportError:  # pragma: no cover - handled at runtime
    PdfReader = None

ALLOWED_EXTENSIONS = {".pdf", ".md", ".txt"}


def extract_text_from_upload(filename: str, content: bytes) -> str:
    suffix = Path(filename).suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise ValueError("Unsupported file type. Use PDF, Markdown, or TXT.")

    if suffix == ".pdf":
        return _extract_pdf_text(content)
    return content.decode("utf-8", errors="ignore")


def _extract_pdf_text(raw: bytes) -> str:
    if PdfReader is None:
        raise ValueError("PDF extraction unavailable; install PyPDF2.")
    buffer = io.BytesIO(raw)
    reader = PdfReader(buffer)
    text_parts: list[str] = []
    for page in reader.pages:
        try:
            text_parts.append(page.extract_text() or "")
        except NotImplementedError:
            # Some PDF pages may not support text extraction; skip gracefully.
            continue
    extracted = "\n".join(text_parts).strip()
    return extracted

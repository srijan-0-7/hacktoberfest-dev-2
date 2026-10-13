import os
from typing import Tuple, Optional
from io import BytesIO


def extract_text_from_pdf(file_bytes: bytes) -> Tuple[str, Optional[str]]:
    try:
        import fitz  # PyMuPDF
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        text_parts = []
        for page in doc:
            page_text = page.get_text()
            if page_text:
                text_parts.append(page_text.strip())
        doc.close()
        full_text = "\n\n".join(text_parts).strip()
        if not full_text:
            return "", "PDF was parsed but contained no selectable text. It may be a scanned document."
        return full_text, None
    except ImportError:
        return "", "PyMuPDF is not installed. For PDF scanning, install pymupdf or enter order text directly."
    except Exception as e:
        return "", f"Could not read PDF: {str(e)}"


def extract_text_from_image(file_bytes: bytes) -> Tuple[str, Optional[str]]:
    try:
        from PIL import Image
        image = Image.open(BytesIO(file_bytes)).convert("RGB")
    except ImportError:
        return "", "Pillow is not installed. Enter order text directly or install pillow."
    except Exception as e:
        raise ValueError(f"Invalid image format: {str(e)}")

    try:
        import pytesseract
        text = pytesseract.image_to_string(image)
        return text.strip(), None
    except Exception:
        notice = "Tesseract OCR engine is not detected on this system. For image scanning, install Tesseract OCR (https://github.com/UB-Mannheim/tesseract/wiki on Windows) or enter order text directly."
        return "", notice


def process_uploaded_document(file_bytes: bytes, filename: str) -> Tuple[str, Optional[str]]:
    ext = os.path.splitext(filename)[1].lower()
    if ext == ".pdf":
        return extract_text_from_pdf(file_bytes)
    elif ext in [".png", ".jpg", ".jpeg"]:
        return extract_text_from_image(file_bytes)
    elif ext in [".txt", ".csv"]:
        return file_bytes.decode("utf-8", errors="replace"), None
    else:
        raise ValueError(f"Unsupported file format '{ext}'. Supported formats: .pdf, .png, .jpg, .jpeg, .txt, .csv")

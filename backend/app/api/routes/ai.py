from typing import Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.config import settings
from app.models.settings import BusinessSettings
from app.schemas.extraction import ExtractionResult, AIStatusResponse
from app.services.ai.document_processor import process_uploaded_document
from app.services.ai.extraction_service import run_order_extraction, get_ai_provider

router = APIRouter()


@router.get("/ai/status", response_model=AIStatusResponse)
async def get_ai_status(db: Session = Depends(get_db)):
    biz_settings = db.query(BusinessSettings).first()
    active_provider = biz_settings.ai_provider if biz_settings else settings.AI_PROVIDER
    ollama_url = biz_settings.ollama_base_url if biz_settings else settings.OLLAMA_BASE_URL
    ollama_model = biz_settings.ollama_model if biz_settings else settings.OLLAMA_MODEL
    gemini_model = biz_settings.gemini_model if biz_settings else settings.GEMINI_MODEL

    # Test Ollama reachability quickly
    ollama_provider = get_ai_provider("ollama", biz_settings)
    ollama_ok, _ = await ollama_provider.check_connection()

    gemini_configured = bool(settings.GEMINI_API_KEY and settings.GEMINI_API_KEY.strip())

    return AIStatusResponse(
        configured_provider=active_provider,
        active_provider=active_provider,
        ollama_available=ollama_ok,
        ollama_endpoint=ollama_url,
        ollama_model=ollama_model,
        gemini_configured=gemini_configured,
        gemini_model=gemini_model,
    )


@router.post("/ai/test-connection")
async def test_ai_connection(
    provider: Optional[str] = None,
    db: Session = Depends(get_db),
):
    biz_settings = db.query(BusinessSettings).first()
    target_provider_name = provider or (biz_settings.ai_provider if biz_settings else settings.AI_PROVIDER)

    provider_instance = get_ai_provider(target_provider_name, biz_settings)
    is_ok, message = await provider_instance.check_connection()

    return {
        "provider": target_provider_name,
        "connected": is_ok,
        "message": message or ("Connected successfully" if is_ok else "Connection failed"),
    }


@router.post("/orders/extract", response_model=ExtractionResult)
async def extract_order_from_input(
    file: Optional[UploadFile] = File(None),
    raw_text: Optional[str] = Form(None),
    provider: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    """
    Flagship extraction endpoint:
    - Extracts text from PDF or image or accepts direct text input
    - Interprets order via configured local Ollama or Gemini provider
    - Validates against catalogue and returns line items with confidence indicators
    """
    extracted_text = ""
    notice = None

    if file:
        file_bytes = await file.read()
        max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
        if len(file_bytes) > max_bytes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File exceeds maximum upload size of {settings.MAX_UPLOAD_SIZE_MB}MB",
            )

        try:
            extracted_text, notice = process_uploaded_document(file_bytes, file.filename)
        except ValueError as ve:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    elif raw_text and raw_text.strip():
        extracted_text = raw_text.strip()
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide an order file (PDF/Image) or enter order text directly.",
        )

    if not extracted_text.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=notice or "No readable text could be extracted from the document. Please enter the items manually.",
        )

    try:
        result = await run_order_extraction(extracted_text, db, provider_override=provider)
        if notice:
            result.notes.append(notice)
        return result
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(ve))
    except RuntimeError as re:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(re))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Extraction failure: {str(e)}")

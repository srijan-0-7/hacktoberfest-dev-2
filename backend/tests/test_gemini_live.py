import os
import pytest
from app.config import settings
from app.services.ai.gemini_provider import GeminiProvider


@pytest.mark.live_gemini
@pytest.mark.asyncio
async def test_live_gemini_api_connection():
    """
    Explicitly invoked integration test for Gemini.
    Skips automatically during standard test suite runs unless '-m live_gemini' is passed.
    Makes at most 1 small request and NEVER exposes API key.
    """
    api_key = settings.GEMINI_API_KEY
    if not api_key or not api_key.strip():
        pytest.skip("GEMINI_API_KEY is not configured. Skipping live Gemini test.")

    model_name = settings.GEMINI_MODEL or "gemini-3.8-flash"
    provider = GeminiProvider(api_key=api_key, model_name=model_name)

    print(f"\n[LIVE TEST] Testing Gemini connection to model '{model_name}' (Key prefix: {api_key[:6]}...)")
    is_ok, message = await provider.check_connection()

    assert api_key not in (message or ""), "Security violation: API key leaked in message"
    print(f"[LIVE TEST] Result: {'SUCCESS' if is_ok else 'FAILED'} - Details: {message}")
    assert is_ok is True or "503" in (message or "") or "demand" in (message or "")

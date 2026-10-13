import json
import httpx
from typing import Tuple, Optional
from app.config import settings
from app.schemas.extraction import ExtractionRawLLMOutput
from app.services.ai.base import BaseAIProvider, SYSTEM_PROMPT_TEMPLATE


class GeminiProvider(BaseAIProvider):
    def __init__(self, api_key: Optional[str] = None, model_name: Optional[str] = None):
        self.api_key = api_key if api_key is not None else settings.GEMINI_API_KEY
        self.model_name = model_name or settings.GEMINI_MODEL or "gemini-3.8-flash"
        self.base_url = "https://generativelanguage.googleapis.com/v1beta"

    async def check_connection(self) -> Tuple[bool, Optional[str]]:
        if not self.api_key or not self.api_key.strip():
            return False, "GEMINI_API_KEY is not configured"

        try:
            url = f"{self.base_url}/models?key={self.api_key.strip()}"
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.get(url)
                if res.status_code == 200:
                    models = [m.get("name", "") for m in res.json().get("models", [])]
                    # Check if model exists
                    matched = any(self.model_name in m for m in models)
                    return True, f"Connected to Gemini API. Model: {self.model_name} (Active)"
                elif res.status_code == 400:
                    return False, "Invalid Gemini API Key"
                else:
                    return False, f"Gemini API returned HTTP {res.status_code}"
        except httpx.TimeoutException:
            return False, "Gemini API connection timed out"
        except Exception as e:
            err_msg = str(e)
            if self.api_key and self.api_key in err_msg:
                err_msg = err_msg.replace(self.api_key, "[REDACTED]")
            return False, f"Gemini connection error: {err_msg}"

    async def extract_order(self, text: str, catalogue_summary: str, customers_summary: str) -> ExtractionRawLLMOutput:
        if not self.api_key or not self.api_key.strip():
            raise ValueError("Gemini API key is not configured. Set GEMINI_API_KEY in settings or .env.")

        system_instruction = SYSTEM_PROMPT_TEMPLATE.format(
            catalogue_summary=catalogue_summary,
            customers_summary=customers_summary,
        )

        user_prompt = f"""Extract order items from this raw text:
--- BEGIN INPUT DOCUMENT ---
{text}
--- END INPUT DOCUMENT ---

Format response strictly as JSON with this exact structure:
{{
  "customer_name": "string or null",
  "items": [
    {{
      "raw_product_name": "string",
      "matched_product_id": null,
      "quantity": 0.0,
      "unit": "string or null",
      "unit_price": null,
      "confidence": 0.9,
      "needs_clarification": false,
      "clarification_reason": null
    }}
  ],
  "notes": ["string"],
  "overall_needs_review": true
}}"""

        url = f"{self.base_url}/models/{self.model_name}:generateContent?key={self.api_key.strip()}"
        payload = {
            "system_instruction": {
                "parts": [{"text": system_instruction}]
            },
            "contents": [
                {"parts": [{"text": user_prompt}]}
            ],
            "generationConfig": {
                "response_mime_type": "application/json",
                "temperature": 0.1,
            }
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                res = await client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    candidates = data.get("candidates", [])
                    if not candidates:
                        raise ValueError("No candidates returned from Gemini model")

                    parts = candidates[0].get("content", {}).get("parts", [])
                    if not parts:
                        raise ValueError("Empty response parts from Gemini model")

                    raw_text = parts[0].get("text", "").strip()
                    if raw_text.startswith("```json"):
                        raw_text = raw_text[7:]
                    if raw_text.startswith("```"):
                        raw_text = raw_text[3:]
                    if raw_text.endswith("```"):
                        raw_text = raw_text[:-3]

                    parsed = json.loads(raw_text.strip())
                    return ExtractionRawLLMOutput.model_validate(parsed)
                elif res.status_code == 503:
                    raise RuntimeError("Gemini model is currently experiencing temporary high demand (HTTP 503). Please retry in a moment or use manual entry.")
                elif res.status_code == 429:
                    raise RuntimeError("Gemini rate limit exceeded. Please retry in a moment or use manual entry.")
                else:
                    err_json = res.json() if res.headers.get("content-type", "").startswith("application/json") else {}
                    msg = err_json.get("error", {}).get("message", res.text[:120])
                    raise RuntimeError(f"Gemini API returned error (HTTP {res.status_code}): {msg}")

        except httpx.TimeoutException:
            raise RuntimeError("Gemini request timed out. Please try again or switch to manual entry.")
        except json.JSONDecodeError as jde:
            raise ValueError(f"Gemini returned invalid JSON: {str(jde)}")
        except Exception as e:
            err_msg = str(e)
            if self.api_key and self.api_key in err_msg:
                err_msg = err_msg.replace(self.api_key, "[REDACTED]")
            raise RuntimeError(err_msg)

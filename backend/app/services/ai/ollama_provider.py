import json
import httpx
from typing import Tuple, Optional
from app.config import settings
from app.schemas.extraction import ExtractionRawLLMOutput
from app.services.ai.base import BaseAIProvider, SYSTEM_PROMPT_TEMPLATE


class OllamaProvider(BaseAIProvider):
    def __init__(self, base_url: Optional[str] = None, model_name: Optional[str] = None):
        self.base_url = (base_url or settings.OLLAMA_BASE_URL).rstrip("/")
        self.model_name = model_name or settings.OLLAMA_MODEL or "qwen2.5:7b"

    async def check_connection(self) -> Tuple[bool, Optional[str]]:
        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                res = await client.get(f"{self.base_url}/api/tags")
                if res.status_code == 200:
                    data = res.json()
                    models = [m.get("name") for m in data.get("models", [])]
                    # Check if model is pulled
                    matched = any(self.model_name in m for m in models)
                    if matched:
                        return True, None
                    return True, f"Ollama is running, but model '{self.model_name}' is not downloaded. Available models: {', '.join(models) if models else 'None'}"
                return False, f"Ollama responded with HTTP {res.status_code}"
        except httpx.ConnectError:
            return False, f"Could not connect to Ollama at {self.base_url}. Make sure Ollama is installed and running."
        except Exception as e:
            return False, f"Ollama connection check failed: {str(e)}"

    async def extract_order(self, text: str, catalogue_summary: str, customers_summary: str) -> ExtractionRawLLMOutput:
        system_instruction = SYSTEM_PROMPT_TEMPLATE.format(
            catalogue_summary=catalogue_summary,
            customers_summary=customers_summary,
        )

        user_prompt = f"""Extract order items from this text:
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

        payload = {
            "model": self.model_name,
            "prompt": f"{system_instruction}\n\n{user_prompt}",
            "stream": False,
            "format": "json",
            "options": {
                "temperature": 0.1,
            }
        }

        try:
            async with httpx.AsyncClient(timeout=45.0) as client:
                res = await client.post(f"{self.base_url}/api/generate", json=payload)
                if res.status_code != 200:
                    raise RuntimeError(f"Ollama returned HTTP {res.status_code}: {res.text}")

                data = res.json()
                raw_response = data.get("response", "").strip()
                if not raw_response:
                    raise ValueError("Ollama returned an empty response")

                parsed = json.loads(raw_response)
                return ExtractionRawLLMOutput.model_validate(parsed)

        except httpx.ConnectError:
            raise RuntimeError(f"Ollama is not running at {self.base_url}. Start Ollama with 'ollama serve' or switch to Gemini provider.")
        except httpx.TimeoutException:
            raise RuntimeError("Ollama extraction timed out. Please try with a smaller text or check Ollama performance.")
        except json.JSONDecodeError as jde:
            raise ValueError(f"Ollama returned invalid JSON: {str(jde)}")
        except Exception as e:
            raise RuntimeError(f"Ollama extraction error: {str(e)}")

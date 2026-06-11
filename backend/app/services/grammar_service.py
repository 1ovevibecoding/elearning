"""
Grammar Service — Kiểm tra ngữ pháp tiếng Anh sử dụng Google Gemini

Real mode: Gọi Gemini API để phân tích ngữ pháp chuyên sâu
Fallback: Phát hiện lỗi phổ biến bằng regex nếu API lỗi
"""
import re
import json
from google import genai
from google.genai import types
from app.config import get_settings
from app.schemas.grammar import GrammarCorrection, GrammarCheckResponse

settings = get_settings()

# Gemini client
gemini_client = genai.Client(api_key=settings.GEMINI_API_KEY)


async def check_grammar(text: str) -> GrammarCheckResponse:
    """Kiểm tra ngữ pháp sử dụng Google Gemini."""
    try:
        return await _gemini_check(text)
    except Exception:
        # Fallback to regex nếu API lỗi
        return _fallback_check(text)


async def _gemini_check(text: str) -> GrammarCheckResponse:
    """Gọi Gemini API để kiểm tra ngữ pháp chuyên sâu."""
    prompt = f"""Analyze the following English text for grammar errors.
Return a JSON object with:
- "corrections": array of objects with "original" (the wrong text), "corrected" (the fixed text), "explanation" (explanation in Vietnamese), "rule" (grammar rule name in English)
- "corrected_text": the full corrected text

If there are no errors, return {{"corrections": [], "corrected_text": "<original text>"}}

Text: "{text}"

Return ONLY valid JSON, no markdown formatting, no code blocks."""

    response = gemini_client.models.generate_content(
        model=settings.GEMINI_MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            temperature=0.2,
            max_output_tokens=1000,
        ),
    )

    content = response.text or "{}"
    # Clean up potential markdown code blocks
    content = content.strip()
    if content.startswith("```"):
        content = content.split("\n", 1)[1] if "\n" in content else content[3:]
    if content.endswith("```"):
        content = content[:-3]
    content = content.strip()

    data = json.loads(content)

    corrections = [
        GrammarCorrection(**c) for c in data.get("corrections", [])
    ]
    return GrammarCheckResponse(
        corrections=corrections,
        corrected_text=data.get("corrected_text", text),
    )


# ── Fallback regex check ────────────────────────────────────────────

COMMON_ERRORS = [
    {"pattern": r"\bI\s+is\b", "original": "I is", "corrected": "I am",
     "explanation": "'I' luôn đi với 'am', không dùng 'is'.", "rule": "Subject-Verb Agreement"},
    {"pattern": r"\bhe\s+are\b", "original": "he are", "corrected": "he is",
     "explanation": "'He' là ngôi thứ ba số ít, dùng 'is'.", "rule": "Subject-Verb Agreement"},
    {"pattern": r"\bthey\s+is\b", "original": "they is", "corrected": "they are",
     "explanation": "'They' là số nhiều, dùng 'are'.", "rule": "Subject-Verb Agreement"},
    {"pattern": r"\bhave\s+went\b", "original": "have went", "corrected": "have gone",
     "explanation": "Past participle của 'go' là 'gone'.", "rule": "Perfect Tense"},
    {"pattern": r"\bmore\s+better\b", "original": "more better", "corrected": "better",
     "explanation": "'Better' đã là so sánh hơn, không cần 'more'.", "rule": "Comparative Form"},
]


def _fallback_check(text: str) -> GrammarCheckResponse:
    """Phát hiện lỗi phổ biến bằng regex (fallback)."""
    corrections: list[GrammarCorrection] = []
    corrected_text = text

    for rule in COMMON_ERRORS:
        if re.search(rule["pattern"], text, re.IGNORECASE):
            corrections.append(GrammarCorrection(
                original=rule["original"],
                corrected=rule["corrected"],
                explanation=rule["explanation"],
                rule=rule["rule"],
            ))
            corrected_text = re.sub(
                rule["pattern"], rule["corrected"], corrected_text, count=1, flags=re.IGNORECASE
            )

    return GrammarCheckResponse(corrections=corrections, corrected_text=corrected_text)

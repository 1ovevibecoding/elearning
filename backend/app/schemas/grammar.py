"""
Grammar schemas — Pydantic models cho Grammar Checker API
"""
from pydantic import BaseModel


class GrammarCheckRequest(BaseModel):
    text: str


class GrammarCorrection(BaseModel):
    original: str
    corrected: str
    explanation: str
    rule: str


class GrammarCheckResponse(BaseModel):
    corrections: list[GrammarCorrection]
    corrected_text: str

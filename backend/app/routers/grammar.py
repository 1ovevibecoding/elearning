"""
Grammar Router — API endpoints cho Grammar Checker
"""
from fastapi import APIRouter

from app.schemas.grammar import GrammarCheckRequest, GrammarCheckResponse
from app.services.grammar_service import check_grammar

router = APIRouter(prefix="/api/grammar", tags=["Grammar"])


@router.post("/check", response_model=GrammarCheckResponse)
async def check_grammar_endpoint(payload: GrammarCheckRequest):
    """Kiểm tra ngữ pháp tiếng Anh và trả về danh sách lỗi với giải thích."""
    return await check_grammar(payload.text)

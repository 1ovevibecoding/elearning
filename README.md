# PREP IELTS

AI-powered IELTS preparation platform.

## Environment Variables
Create `.env.local`:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GROQ_API_KEY`
- `GEMINI_API_KEY`
- `GROQ_MODEL` *(tùy chọn, mặc định: `"openai/gpt-oss-120b"`)*
- `GEMINI_MODEL` *(tùy chọn, mặc định: `"gemini-3.5-flash"`)*

## Setup & Scripts
1. `npm install`
2. Chạy SQL migrations trong `supabase/migrations/` tuần tự.
3. Kiểm tra kết nối AI providers:
   ```bash
   npm run check-ai
   # hoặc: node scripts/check-ai.mjs
   ```
4. `npm run dev`

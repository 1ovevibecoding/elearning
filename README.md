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

## Setup
1. `npm install`
2. Run SQL migrations in `supabase/migrations/` sequentially.
3. `npm run dev`

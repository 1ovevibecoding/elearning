# 🎓 Lingua — E-Learning English Tutor Platform

An AI-powered English learning platform built for collaborative learning between study partners. Features real-time AI tutoring, vocabulary management, spaced repetition flashcards, grammar checking, roleplay scenarios, and a shared study calendar.

## ✨ Features

- **🤖 AI English Tutor** — Real-time chat with Google Gemini AI, personalized with your vocabulary
- **📖 Vocabulary Manager** — Save, search, and organize English words with definitions and examples
- **📇 Flashcard Review** — Spaced repetition (SM-2) with keyboard shortcuts and progress tracking
- **✏️ Grammar Checker** — AI-powered grammar analysis with Vietnamese explanations
- **🎭 Roleplay Scenarios** — Practice real-world English conversations (coffee shop, job interview, etc.)
- **📅 Shared Calendar** — Coordinate study schedules with your learning partner
- **📊 Progress Comparison** — Track and compare learning progress between users
- **🔥 Streak Tracking** — Daily learning streaks with activity heatmap

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Vanilla CSS |
| Backend | FastAPI, SQLAlchemy (async), Python 3.11 |
| AI | Google Gemini 2.0 Flash (free tier) |
| Database | SQLite (dev) / PostgreSQL (prod) |
| Auth | JWT + dev login (Google OAuth ready) |

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+

### Setup

```bash
# Clone
git clone https://github.com/YOUR_USERNAME/lingua-e-learning.git
cd lingua-e-learning

# Backend
cd backend
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** → Click "Get Started" → Start learning!

### Get a Gemini API Key (free)
1. Go to https://aistudio.google.com/apikey
2. Click "Create API Key"
3. Copy and paste into `backend/.env`

## 📁 Project Structure

```
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI entry point
│   │   ├── config.py        # Environment settings
│   │   ├── database.py      # SQLAlchemy async setup
│   │   ├── models/          # ORM models
│   │   ├── schemas/         # Pydantic DTOs
│   │   ├── services/        # Business logic
│   │   └── routers/         # API endpoints
│   ├── .env.example
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/           # React pages
│   │   ├── components/      # Reusable components
│   │   ├── services/api.ts  # API client
│   │   ├── hooks/           # Custom hooks
│   │   └── types/           # TypeScript types
│   └── package.json
├── extension/               # Chrome Extension (hover-to-define)
├── render.yaml              # Render.com deploy config
└── Procfile                 # Process file for deployment
```

## 🌐 Deploy to Render.com

1. Push to GitHub
2. Go to [Render.com](https://render.com) → New Web Service
3. Connect your GitHub repo
4. Set environment variables: `GEMINI_API_KEY`, `SECRET_KEY`
5. Deploy! 🎉

## 📝 License

MIT

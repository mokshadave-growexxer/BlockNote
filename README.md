# BlockNote Enhanced — Full Feature Application

A BlockNote-style web application with a React frontend, Node.js/Express backend, and PostgreSQL database.

## ✨ New Features Added

### 1. 📌 Pinned Documents
- Pin/unpin documents from both the **dashboard** and **editor** header
- Pinned documents always appear **at the top** of the list with a visual indicator
- Keyboard shortcut: `Ctrl/Cmd + Shift + P` to toggle pin from the editor

### 2. 😀 Emoji Icons & 🎨 Cover Images
- Set a custom **emoji icon** for each document (shown on dashboard & editor)
- Add a **cover image** by choosing from presets or pasting a URL
- Changes persist immediately to the database

### 3. ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl/Cmd + N` | Create new document (dashboard) |
| `Ctrl/Cmd + S` | Confirm save (editor) |
| `Ctrl/Cmd + B` | Bold text (editor, native) |
| `Ctrl/Cmd + I` | Italic text (editor, native) |
| `Ctrl/Cmd + /` | Open slash menu (editor) |
| `Ctrl/Cmd + Shift + P` | Pin/unpin document (editor) |
| `Ctrl/Cmd + Shift + D` | Toggle dark/light mode |

### 4. 🤖 Mio AI (Powered by Gemini)
- **✨ Mio AI** button in editor toolbar with dropdown menu
- Three AI actions:
  - **Grammar Check** — fixes grammar while preserving meaning (with Apply button)
  - **Paraphrase** — rewrites text in fresh words (with Apply button)
  - **Summarize** — condenses text to key points (display only)
- Results shown in a beautiful animated modal
- Secure — Gemini API key stored only in backend `.env`

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL database

### 1. Install dependencies

```bash
# Root (if using workspace)
npm install

# Backend
cd backend && npm install

# Frontend
cd frontend && npm install
```

### 2. Configure environment

**Backend** (`backend/.env`):
```env
DATABASE_URL="postgresql://user:password@localhost:5432/blocknote"
JWT_ACCESS_SECRET="your-access-secret"
JWT_REFRESH_SECRET="your-refresh-secret"
ACCESS_TOKEN_EXPIRY="15m"
REFRESH_TOKEN_EXPIRY="7d"
FRONTEND_URL="http://localhost:5173"
BACKEND_URL="http://localhost:5000"
PORT=5000
NODE_ENV="development"
GEMINI_API_KEY="your_gemini_api_key_here"   # ← Required for AI features
```

Get a free Gemini API key at: https://aistudio.google.com/app/apikey

### 3. Run database migrations

```bash
cd backend

# Option A: Prisma migrate (for new/development DB)
npx prisma migrate dev

# Option B: If DB already exists, apply the new migration manually:
# ALTER TABLE document ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;
# ALTER TABLE document ADD COLUMN IF NOT EXISTS icon TEXT;
# ALTER TABLE document ADD COLUMN IF NOT EXISTS cover_url TEXT;

npx prisma generate
```

### 4. Start development servers

```bash
# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — Frontend
cd frontend && npm run dev
```

Open http://localhost:5173

---

## 🗄️ Database Schema Changes

```sql
ALTER TABLE "document" ADD COLUMN "is_pinned" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "document" ADD COLUMN "icon" TEXT;
ALTER TABLE "document" ADD COLUMN "cover_url" TEXT;
```

## 📡 New API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `PATCH` | `/api/documents/:id/pin` | Toggle pinned status |
| `PATCH` | `/api/documents/:id/icon` | Update emoji icon |
| `PATCH` | `/api/documents/:id/cover` | Update cover image URL |
| `POST` | `/api/ai/process` | Run AI action (grammar/paraphrase/summary) |

## 🏗️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite, TailwindCSS, Framer Motion, Zustand, TanStack Query
- **Backend**: Node.js, Express 5, TypeScript, Prisma ORM
- **Database**: PostgreSQL
- **AI**: Google Gemini 1.5 Flash

# BlockNote Enhanced — AI-Powered Document Editor

A Notion-like document editor with real-time editing, AI assistance, and document sharing. Built with React, Node.js, and PostgreSQL.

---

## 🌟 Features

### Core Editing
- **📝 Block-based editing** — Rich text formatting with a clean, Notion-inspired interface
- **🎨 Markdown support** — Type `/` to access formatting options, or use markdown syntax
- **🔄 Real-time sync** — Changes save automatically to the database
- **🌙 Dark/Light mode** — Toggle theme in settings

### Document Management
- **📌 Pin documents** — Keep important docs at the top of your dashboard
- **😀 Emoji icons** — Add personal emoji to each document
- **🖼️ Cover images** — Customize document cover with URL or preset images
- **🔗 Share documents** — Generate shareable read-only links for collaboration

### AI Features (Powered by Gemini)
- **✍️ Grammar Check** — Fix grammar while keeping your meaning intact
- **🔄 Paraphrase** — Rewrite text in fresh words
- **📖 Summarize** — Condense text to key points
- **🎯 AI Toolbar** — Works on any selected text

---

## 🚀 Setup Instructions

### What You Need
- **Node.js** version 18 or higher
- **PostgreSQL** database (local or online)
- **Gemini API key** (free from [Google AI Studio](https://aistudio.google.com/app/apikey))

### Step 1: Clone & Install

```bash
# Clone the repository
git clone <repo-url>
cd ProjectAI_Enhanced

# Install all dependencies
npm install
```

### Step 2: Set Up Environment Variables

Create a `.env` file in the `backend` folder with these values:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/blocknote"

# JWT Secrets (create random strings, at least 32 characters)
JWT_ACCESS_SECRET="your-random-secret-here"
JWT_REFRESH_SECRET="another-random-secret-here"

# Server Configuration
PORT=5000
NODE_ENV="development"
FRONTEND_URL="http://localhost:5173"

# AI (Get free key from https://aistudio.google.com/app/apikey)
GEMINI_API_KEY="your_api_key_here"

# Token Expiry
ACCESS_TOKEN_EXPIRY="15m"  # How long login stays valid
REFRESH_TOKEN_EXPIRY="7d"  # How long you stay logged in
```

**Note:** Never commit `.env` to git. It contains sensitive keys.

### Step 3: Set Up Database

```bash
cd backend

# Create and run migrations
npx prisma migrate dev

# Generate Prisma client
npx prisma generate
```

### Step 4: Run the App

**Terminal 1 — Backend (API server)**:
```bash
cd backend
npm run dev
# Runs on http://localhost:5000
```

**Terminal 2 — Frontend (Web app)**:
```bash
cd frontend
npm run dev
# Open http://localhost:5173
```

That's it! You're ready to use BlockNote locally.

---
## 🐳 Docker Setup (Alternative)

If you prefer, you can run everything with Docker Compose (no need to install Node.js or PostgreSQL locally).

### Prerequisites
- **Docker** and **Docker Compose** installed

### Step 1: Create Docker Compose File

Create a `docker-compose.yml` in the project root:

```yaml
version: '3.9'

services:
  postgres:
    image: postgres:16
    container_name: blocknote-db
    environment:
      POSTGRES_USER: blocknote
      POSTGRES_PASSWORD: blocknote_password
      POSTGRES_DB: blocknote
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U blocknote"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: blocknote-api
    ports:
      - "5000:5000"
    environment:
      DATABASE_URL: "postgresql://blocknote:blocknote_password@postgres:5432/blocknote"
      NODE_ENV: "development"
      PORT: "5000"
      JWT_ACCESS_SECRET: "dev-access-secret-please-change-in-production"
      JWT_REFRESH_SECRET: "dev-refresh-secret-please-change-in-production"
      FRONTEND_URL: "http://localhost:5173"
      GEMINI_API_KEY: "${GEMINI_API_KEY}"
    depends_on:
      postgres:
        condition: service_healthy
    command: sh -c "npx prisma migrate deploy && npm run dev"

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: blocknote-web
    ports:
      - "5173:5173"
    environment:
      VITE_API_URL: "http://localhost:5000"
    depends_on:
      - backend

volumes:
  postgres_data:
```

### Step 2: Create Dockerfiles

**backend/Dockerfile:**
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 5000
CMD ["npm", "run", "dev"]
```

**frontend/Dockerfile:**
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5173
CMD ["npm", "run", "dev"]
```

### Step 3: Set Environment Variables

Create a `.env` file in the project root:

```env
GEMINI_API_KEY="your_api_key_here"
```

### Step 4: Run Everything

```bash
# Start all services (database, backend, frontend)
docker-compose up

# Wait for services to start (2-3 minutes first time)
# Visit http://localhost:5173
```

### Useful Docker Commands

```bash
# Stop all services
docker-compose down

# View logs
docker-compose logs -f

# Restart a specific service
docker-compose restart backend

# Reset database (careful!)
docker-compose down -v  # Removes all data
docker-compose up

# Run migrations manually
docker-compose exec backend npx prisma migrate dev
```

---
## 🔧 Environment Variables 

### Backend `.env` Variables

| Variable | What It Does | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/blocknote` |
| `PORT` | Which port the backend runs on | `5000` |
| `NODE_ENV` | Environment (development/production) | `development` |
| `FRONTEND_URL` | Where your frontend is hosted (for CORS) | `http://localhost:5173` |
| `JWT_ACCESS_SECRET` | Secret to sign login tokens (15 min) | Any random 32+ character string |
| `JWT_REFRESH_SECRET` | Secret to keep you logged in (7 days) | Any random 32+ character string |
| `ACCESS_TOKEN_EXPIRY` | How long you stay logged in per session | `15m` = 15 minutes |
| `REFRESH_TOKEN_EXPIRY` | How long the app remembers you | `7d` = 7 days |
| `GEMINI_API_KEY` | Google AI API for grammar/paraphrase | Get free from Google AI Studio |

**Security Tip:** In production, use a secrets manager (AWS Secrets, Vault, etc.) instead of `.env` files.

---

## 🏗️ Architecture Decisions

### Why This Stack?

**React + TypeScript** ✅
- Strong type safety prevents bugs
- Large ecosystem of libraries
- Works great for rich text editors

**Express + Node.js** ✅
- Fast API server, easy to scale
- JavaScript on both frontend and backend = code sharing, faster development
- Perfect for real-time document syncing

**PostgreSQL** ✅
- Reliable for document storage
- Supports JSON fields (stores block content efficiently)
- Good for relational data (users ↔ documents)

### Key Technical Choices

**1. Fractional Ordering for Blocks**
When you insert a block between two existing blocks, we use fractional numbers (1000, 1500.5, 2000) instead of integers (1, 2, 3). This lets us insert unlimited blocks without reorganizing everything.

**2. JWT with Refresh Tokens**
- **Access Token** (15 min) — Quick login verification
- **Refresh Token** (7 days) — Keeps you logged in, stored in secure cookies
- Balances security with user experience

**3. CSRF Double-Submit Cookies**
We protect against cross-site attacks by validating tokens in both cookies and headers. This prevents other websites from modifying your documents.

**4. Markdown-to-HTML Conversion**
All formatted text (like AI responses) gets converted to HTML before storage, so the editor can highlight, manipulate, and style it properly.

**5. Separate Frontend/Backend Deployments**
Frontend serves as a static website (Render, Vercel, etc.). Backend is a separate API service (Render, Railway, etc.). They communicate via REST API.
- **Benefit:** Each scales independently, easier to debug
- **Trade-off:** Slight added complexity in deployment

---

## ⚠️ Known Issues & Limitations

### Current Limitations

| Issue | Status | Details |
|-------|--------|---------|
| **Longer load time** | ⚠️ Slow | Hosted website might take a few seconds to load (restore session screen.) |
| **Large documents** | ⚠️ Slow | Documents with 500+ blocks may feel sluggish. Need pagination/virtual scrolling. |
| **Share link expiry** | ❌ No expiry | Share links never expire. Can revoke manually. |
| **Mobile editing** | ✅ Partial | Works on tablet, a bit cramped on phones. Touch keyboard can help. |
| **Undo/Redo** | ❌ Not implemented | No undo yet—be careful with deletes! |
| **Nested blocks** | ❌ Not supported | All blocks are flat. Lists don't indent. |

---

## 🤔 Edge Case Decisions

### 1. **Pressing Enter on a Heading**
**Decision:** New line becomes a heading too (not a paragraph).
**Why:** When you're writing a heading and press Enter, you expect the next line to continue as a heading. It'd be jarring to suddenly switch to paragraph style.

### 2. **Deleting a Block When Text is Selected**
**Decision:** Delete the selected text within the block first, then focus the same block.
**Why:** You probably didn't mean to delete the entire block. This feels more intuitive—like how Google Docs works.


### 3. **Inserting Blocks Between Non-Editable Blocks (like images)**
**Decision:** Only show insert buttons on images, dividers, and code—not on text blocks.
**Why:** Prevents accidental block insertion while typing. You can still use the `/` menu in text blocks to insert anything you want.

### 5. **AI Response with Formatting**
**Decision:** Convert markdown (`**bold**`, `*italic*`, `` `code` ``) to HTML tags automatically.
**Why:** So the toolbar recognizes formatted text and lets you edit it. Without this, the toolbar wouldn't " see" your bold text.

### 6. **Sharing a Document You Don't Own**
**Decision:** Blocked. Only the creator can share a document.
**Why:** Prevents unauthorized sharing of someone else's private documents. Even if you can read it, you can't give access to others.

### 7. **Inserting Block When Document is Empty**
**Decision:** Create a blank paragraph automatically.
**Why:** You need a starting point. An empty document with no blocks would be confusing.

---

## 📦 Deployment

### Frontend (React - Vercel / Render)

```bash
# Build the frontend
cd frontend
npm run build
# Uploads the `dist` folder to your host
```

### Backend (Express - Render / Railway)

```bash
# Render build command:
npm install && npx prisma generate && npm run build

# Render start command:
npm start
```

**Important:** Set environment variables in your hosting dashboard, not in code.

---

## 🛠️ Development Tips

### View Database (Prisma Studio)
```bash
cd backend
npx prisma studio
# Opens visual database editor at http://localhost:5555
```

### Run TypeScript Check
```bash
npm run lint
# Finds type errors without running the code
```

### Clear Database & Start Over
```bash
cd backend
npx prisma migrate reset
# Careful—this deletes all data!
```

---

## 🤝 Contributing

Found a bug or have an idea? Open an issue or submit a PR!



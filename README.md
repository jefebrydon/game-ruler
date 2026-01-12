# Rule Finder

AI-powered board game rules assistant. Get answers about game rules, see sources directly in the rulebook.

## Prerequisites

- Node.js 18+
- [Supabase](https://supabase.com) account
- [OpenAI](https://platform.openai.com) API key
- [Google AI](https://aistudio.google.com) API key (Gemini)

## Quick Start

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Fill in: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY, GOOGLE_AI_API_KEY

# Set up Supabase
# 1. Run supabase/migrations/001_initial_schema.sql in SQL Editor
# 2. Create public storage bucket named "rulebooks"

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

## Documentation

See **[AGENTS.md](AGENTS.md)** for architecture, code patterns, and how to make changes.


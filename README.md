# Rule Finder

AI-powered board game rules assistant. Upload a rulebook PDF and get instant answers with page-level citations.

## Features

- Upload PDF rulebooks (up to 50MB)
- Ask questions in natural language
- Get answers with exact page citations
- View the rulebook with automatic page navigation

## Tech Stack

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4
- **UI Components:** Shadcn/ui (button, input, command, card, skeleton, sonner, dialog)
- **Backend:** Next.js API Routes, OpenAI Responses API with file_search
- **Database:** Supabase (Postgres + Storage)
- **Deployment:** Vercel

## Prerequisites

- Node.js 18+
- [Supabase](https://supabase.com) account
- [OpenAI](https://platform.openai.com) API key

## Setup

1. **Clone and install dependencies:**

   ```bash
   git clone <your-repo-url>
   cd rule-finder
   npm install
   ```

2. **Configure environment variables:**

   ```bash
   cp .env.example .env.local
   ```

   Fill in your credentials:
   - `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (Settings → API)
   - `OPENAI_API_KEY` - OpenAI API key

3. **Set up Supabase database:**

   Run the migration in your Supabase SQL Editor:
   ```sql
   -- Copy contents of supabase/migrations/001_initial_schema.sql
   ```

4. **Create storage bucket:**

   In Supabase Dashboard → Storage:
   - Create a bucket named `rulebooks`
   - Set it to **Public**

5. **Run the development server:**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # Home - search + upload CTA
│   ├── upload/            # Upload new rulebook
│   ├── games/             # Browse all games
│   └── games/[slug]/      # Viewer + chat for a game
├── components/ui/         # Shadcn/ui components
├── lib/
│   ├── supabase/          # Supabase client helpers
│   └── utils.ts           # Utility functions
└── types/
    ├── database.ts        # Supabase table types
    └── index.ts           # Shared app types
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## License

MIT

-- Rule Finder Initial Schema
-- Run this in Supabase SQL Editor to set up the database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Rulebooks table
CREATE TABLE rulebooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  year INTEGER,
  game_image_url TEXT,
  thumbnail_url TEXT,
  pdf_url TEXT NOT NULL,
  page_count INTEGER NOT NULL DEFAULT 0,
  openai_vector_store_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending_ingest'
    CHECK (status IN ('pending_ingest', 'ingesting', 'ready', 'error')),
  ingested_pages INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for rulebooks
CREATE INDEX idx_rulebooks_title ON rulebooks (title);
CREATE INDEX idx_rulebooks_status ON rulebooks (status);
CREATE INDEX idx_rulebooks_slug ON rulebooks (slug);

-- Rulebook pages table (maps page numbers to OpenAI file IDs)
CREATE TABLE rulebook_pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rulebook_id UUID NOT NULL REFERENCES rulebooks(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  openai_file_id TEXT NOT NULL,
  text_length INTEGER,
  UNIQUE (rulebook_id, page_number)
);

-- Index for looking up pages by file ID (for citation resolution)
CREATE INDEX idx_rulebook_pages_file_id ON rulebook_pages (openai_file_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER rulebooks_updated_at
  BEFORE UPDATE ON rulebooks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Storage bucket setup (run these in Supabase dashboard or via API)
-- 1. Create bucket named "rulebooks" with public access
-- 2. Storage paths:
--    - pdfs/<rulebookId>.pdf
--    - thumbnails/<rulebookId>.png

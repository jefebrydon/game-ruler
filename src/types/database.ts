/**
 * Database types for Supabase.
 * These match the schema defined in buildplan.md section 3.
 */

export type RulebookStatus =
  | "pending_ingest"
  | "ingesting"
  | "ready"
  | "error";

export type Rulebook = {
  id: string;
  slug: string;
  title: string;
  year: number | null;
  game_image_url: string | null;
  thumbnail_url: string | null;
  pdf_url: string;
  page_count: number;
  openai_vector_store_id: string | null;
  status: RulebookStatus;
  ingested_pages: number;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

export type RulebookInsert = {
  id?: string;
  slug: string;
  title: string;
  year?: number | null;
  game_image_url?: string | null;
  thumbnail_url?: string | null;
  pdf_url: string;
  page_count: number;
  openai_vector_store_id?: string | null;
  status: RulebookStatus;
  ingested_pages?: number;
  error_message?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type RulebookUpdate = {
  slug?: string;
  title?: string;
  year?: number | null;
  game_image_url?: string | null;
  thumbnail_url?: string | null;
  pdf_url?: string;
  page_count?: number;
  openai_vector_store_id?: string | null;
  status?: RulebookStatus;
  ingested_pages?: number;
  error_message?: string | null;
  updated_at?: string;
};

export type RulebookPage = {
  id: string;
  rulebook_id: string;
  page_number: number;
  openai_file_id: string;
  text_length: number | null;
};

export type RulebookPageInsert = {
  id?: string;
  rulebook_id: string;
  page_number: number;
  openai_file_id: string;
  text_length?: number | null;
};

export type Database = {
  public: {
    Tables: {
      rulebooks: {
        Row: Rulebook;
        Insert: RulebookInsert;
        Update: RulebookUpdate;
        Relationships: [];
      };
      rulebook_pages: {
        Row: RulebookPage;
        Insert: RulebookPageInsert;
        Update: Partial<RulebookPageInsert>;
        Relationships: [
          {
            foreignKeyName: "rulebook_pages_rulebook_id_fkey";
            columns: ["rulebook_id"];
            referencedRelation: "rulebooks";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};

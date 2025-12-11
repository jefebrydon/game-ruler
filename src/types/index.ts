/**
 * Shared application types.
 */

export type {
  Database,
  Rulebook,
  RulebookInsert,
  RulebookUpdate,
  RulebookPage,
  RulebookPageInsert,
  RulebookStatus,
} from "./database";

/**
 * API response types.
 * All API routes return either { data } or { error }.
 */
export type ApiSuccessResponse<T> = {
  data: T;
  error?: never;
};

export type ApiErrorResponse = {
  data?: never;
  error: string;
};

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Search result type for game search.
 */
export type RulebookSearchResult = {
  id: string;
  slug: string;
  title: string;
  year: number | null;
  game_image_url: string | null;
};

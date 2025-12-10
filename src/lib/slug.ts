/**
 * Generate a URL-friendly slug from a title.
 * Adds a random suffix to ensure uniqueness.
 */
export function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") // Remove special chars
    .replace(/\s+/g, "-") // Spaces to hyphens
    .replace(/-+/g, "-") // Collapse multiple hyphens
    .substring(0, 50); // Limit length

  const suffix = Math.random().toString(36).substring(2, 8);
  return `${base}-${suffix}`;
}

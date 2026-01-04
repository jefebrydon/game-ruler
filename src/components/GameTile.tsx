import Image from "next/image";
import Link from "next/link";

type GameTileProps = {
  slug: string;
  title: string;
  thumbnailUrl?: string | null;
};

export function GameTile({
  slug,
  title,
  thumbnailUrl,
}: GameTileProps): React.ReactElement {
  return (
    <Link href={`/games/${slug}`} className="group block">
      {/* Square thumbnail */}
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-muted">
        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt={title}
            fill
            className="object-cover transition-transform group-hover:scale-[1.02]"
            sizes="170px"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <svg
              className="h-10 w-10 text-muted-foreground/40"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Game name */}
      <p className="mt-3 text-paragraph text-foreground group-hover:text-primary">
        {title}
      </p>
    </Link>
  );
}


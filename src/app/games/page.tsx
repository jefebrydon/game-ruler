export default function GamesPage(): React.ReactElement {
  return (
    <main className="min-h-screen px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-2xl font-bold">All Games</h1>
        <p className="mt-2 text-muted-foreground">
          Browse rulebooks that have been uploaded to Rule Finder.
        </p>

        {/* TODO: Implement game card grid in Phase 6 */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          <div className="h-48 rounded-lg border bg-muted/50" />
          <div className="h-48 rounded-lg border bg-muted/50" />
          <div className="h-48 rounded-lg border bg-muted/50" />
          <div className="h-48 rounded-lg border bg-muted/50" />
        </div>
      </div>
    </main>
  );
}

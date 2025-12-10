import Link from "next/link";
import { UploadForm } from "@/components/UploadForm";

export default function UploadPage(): React.ReactElement {
  return (
    <main className="min-h-screen px-4 py-8">
      <div className="mx-auto w-full max-w-md">
        {/* Back link */}
        <Link
          href="/"
          className="mb-6 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to home
        </Link>

        <h1 className="text-2xl font-bold">Upload Rulebook</h1>
        <p className="mt-2 text-muted-foreground">
          Upload a PDF rulebook to create an AI-powered rules assistant.
        </p>

        <div className="mt-8">
          <UploadForm />
        </div>
      </div>
    </main>
  );
}

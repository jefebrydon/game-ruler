import { UploadForm } from "@/components/UploadForm";

export default function UploadPage(): React.ReactElement {
  return (
    <main className="min-h-screen px-4 py-8">
      <div className="mx-auto w-full max-w-md">
        <h1 className="text-h2">Upload Rulebook</h1>
        <p className="mt-2 text-paragraph text-muted-foreground">
          Upload a PDF rulebook to create an AI-powered rules assistant.
        </p>

        <div className="mt-8">
          <UploadForm />
        </div>
      </div>
    </main>
  );
}

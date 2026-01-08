import { UploadForm } from "@/components/UploadForm";
import { Header } from "@/components/Header";

export default function UploadPage(): React.ReactElement {
  return (
    <>
      <Header />
      <main className="min-h-screen px-4 py-8">
        <div className="mx-auto w-full max-w-md">
          <h1 className="text-h2">Upload Rulebook</h1>

          <div className="mt-8">
            <UploadForm />
          </div>
        </div>
      </main>
    </>
  );
}

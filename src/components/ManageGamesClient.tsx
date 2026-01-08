"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeftIcon } from "lucide-react";
import { toast } from "sonner";
import type { RulebookStatus } from "@/types/database";

const STORAGE_KEY = "manage-unlocked";
const PASSWORD = "Moc.salt1!";

type RulebookRow = {
  id: string;
  slug: string;
  title: string;
  year: number | null;
  status: RulebookStatus;
  page_count: number;
  created_at: string;
};

type ManageGamesClientProps = {
  rulebooks: RulebookRow[];
};

export function ManageGamesClient({
  rulebooks,
}: ManageGamesClientProps): React.ReactElement {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  // Check sessionStorage on mount
  useEffect(() => {
    if (sessionStorage.getItem(STORAGE_KEY) === "true") {
      setIsUnlocked(true);
    }
    setIsCheckingAuth(false);
  }, []);

  const handleUnlock = (e: React.FormEvent): void => {
    e.preventDefault();
    if (password === PASSWORD) {
      sessionStorage.setItem(STORAGE_KEY, "true");
      setIsUnlocked(true);
      setError("");
    } else {
      setError("Incorrect password");
    }
  };

  const handleGamesClick = (e: React.MouseEvent<HTMLButtonElement>): void => {
    e.preventDefault();
    if (window.location.pathname === "/") {
      const element = document.getElementById("board-games");
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } else {
      router.push("/#board-games");
      setTimeout(() => {
        const element = document.getElementById("board-games");
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 300);
    }
  };

  const handleSelectAll = (checked: boolean): void => {
    setConfirmingDelete(false);
    if (checked) {
      setSelectedIds(new Set(rulebooks.map((r) => r.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean): void => {
    setConfirmingDelete(false);
    const newSet = new Set(selectedIds);
    if (checked) {
      newSet.add(id);
    } else {
      newSet.delete(id);
    }
    setSelectedIds(newSet);
  };

  const handleDeleteClick = (): void => {
    if (confirmingDelete) {
      // Second click - perform deletion
      handleDelete();
    } else {
      // First click - show confirmation
      setConfirmingDelete(true);
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (selectedIds.size === 0) return;

    setIsDeleting(true);
    try {
      const response = await fetch("/api/rulebooks/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });

      const result = await response.json();

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(`Deleted ${result.data.deletedCount} rulebook(s)`);
      setSelectedIds(new Set());
      setConfirmingDelete(false);
      router.refresh();
    } catch (err) {
      console.error("Delete failed:", err);
      toast.error("Failed to delete rulebooks");
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusBadge = (status: RulebookStatus): React.ReactElement => {
    const styles: Record<RulebookStatus, string> = {
      ready: "bg-green-100 text-green-800",
      ingesting: "bg-yellow-100 text-yellow-800",
      pending_ingest: "bg-blue-100 text-blue-800",
      error: "bg-red-100 text-red-800",
    };
    return (
      <span
        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${styles[status]}`}
      >
        {status}
      </span>
    );
  };

  // Show nothing while checking auth to prevent flash
  if (isCheckingAuth) {
    return <div />;
  }

  // Password form when locked
  if (!isUnlocked) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="w-full max-w-sm rounded-lg border border-stone-200 bg-white p-6 shadow-subtle">
          <h2 className="text-h3 mb-4 text-center">Enter Password</h2>
          <form onSubmit={handleUnlock} className="space-y-4">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full"
              autoFocus
            />
            {error && (
              <p className="text-paragraph-sm text-red-600">{error}</p>
            )}
            <Button type="submit" className="w-full">
              Unlock
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // Main content when unlocked
  return (
    <>
      {/* Back button section */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleGamesClick}
          className="!px-0 has-[>svg]:!px-0 text-brass-300 hover:bg-transparent hover:text-brass-450"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Games
        </Button>
      </div>

      {/* Title */}
      <h1 className="text-h2 mb-6">Manage Games</h1>

      {/* Button row */}
      <div className="mb-8 flex gap-3">
        <Button variant="secondary" asChild>
          <Link href="/upload">Upload Rulebook</Link>
        </Button>
        <Button variant="secondary">Bulk Upload</Button>
        <Button
          variant="destructive"
          disabled={selectedIds.size === 0 || isDeleting}
          onClick={handleDeleteClick}
        >
          {isDeleting
            ? "Deleting..."
            : confirmingDelete
              ? `Confirm Deletion (${selectedIds.size})`
              : `Delete${selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}`}
        </Button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
        <table className="w-full">
          <thead className="bg-stone-50">
            <tr className="divide-x divide-stone-200">
              <th className="w-12 px-4 py-3">
                <input
                  type="checkbox"
                  checked={
                    rulebooks.length > 0 &&
                    selectedIds.size === rulebooks.length
                  }
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="h-4 w-4 rounded border-stone-300"
                />
              </th>
              <th className="px-4 py-3 text-left text-paragraph-sm-bold text-stone-600">
                Title
              </th>
              <th className="px-4 py-3 text-left text-paragraph-sm-bold text-stone-600">
                Year
              </th>
              <th className="px-4 py-3 text-left text-paragraph-sm-bold text-stone-600">
                Status
              </th>
              <th className="px-4 py-3 text-left text-paragraph-sm-bold text-stone-600">
                Pages
              </th>
              <th className="px-4 py-3 text-left text-paragraph-sm-bold text-stone-600">
                Created
              </th>
              <th className="px-4 py-3 text-left text-paragraph-sm-bold text-stone-600">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200">
            {rulebooks.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-paragraph text-muted-foreground"
                >
                  No rulebooks found.
                </td>
              </tr>
            ) : (
              rulebooks.map((rulebook) => (
                <tr key={rulebook.id} className="hover:bg-stone-50">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(rulebook.id)}
                      onChange={(e) =>
                        handleSelectOne(rulebook.id, e.target.checked)
                      }
                      className="h-4 w-4 rounded border-stone-300"
                    />
                  </td>
                  <td className="px-4 py-3 text-paragraph-sm text-stone-800">
                    {rulebook.title}
                  </td>
                  <td className="px-4 py-3 text-paragraph-sm text-stone-600">
                    {rulebook.year ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    {getStatusBadge(rulebook.status)}
                  </td>
                  <td className="px-4 py-3 text-paragraph-sm text-stone-600">
                    {rulebook.page_count}
                  </td>
                  <td className="px-4 py-3 text-paragraph-sm text-stone-600">
                    {formatDate(rulebook.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <Button variant="secondary" size="sm">
                      Update
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}


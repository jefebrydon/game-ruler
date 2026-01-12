"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useSignUpModal } from "@/lib/signup-modal-context";

type HeaderProps = {
  /** When true, header overlaps content (for homepage). When false, header is inline above content. */
  floating?: boolean;
};

export function Header({ floating = false }: HeaderProps): React.ReactElement {
  const { open } = useSignUpModal();

  return (
    <header
      className={`${
        floating ? "absolute top-0 left-0 right-0" : "relative"
      } z-50 flex items-center justify-between px-4 py-2`}
      style={{
        backgroundColor: "rgba(245, 245, 244, 0.7)",
        borderBottom: "0.75px solid #EBE8E6",
      }}
    >
      {/* Logo */}
      <Link href="/" className="shrink-0">
        <Image
          src="/RA-logo.png"
          alt="Rules Atlas"
          height={48}
          width={144}
          className="h-12 w-auto"
          priority
          unoptimized
        />
      </Link>

      {/* Action */}
      <Button variant="secondary" onClick={open}>
        Sign Up
      </Button>
    </header>
  );
}

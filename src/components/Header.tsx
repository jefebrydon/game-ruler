import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Header(): React.ReactElement {
  return (
    <header
      className="flex items-center justify-between px-4 py-3"
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
          height={40}
          width={120}
          className="h-10 w-auto"
          priority
          unoptimized
        />
      </Link>

      {/* Action */}
      <Button variant="secondary" size="sm">
        Sign Up
      </Button>
    </header>
  );
}

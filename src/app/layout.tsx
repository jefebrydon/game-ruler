import type { Metadata } from "next";
import { Fraunces, Nunito_Sans } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

const nunitoSans = Nunito_Sans({
  variable: "--font-nunito-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Rule Finder - AI-Powered Board Game Rules Assistant",
  description:
    "Upload a board-game rulebook and instantly get an AI-powered rules assistant with page-level citations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.ReactElement {
  return (
    <html lang="en">
      <body
        className={`${fraunces.variable} ${nunitoSans.variable} font-body antialiased`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}

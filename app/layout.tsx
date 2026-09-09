import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Content Studio",
  description: "Create videos with AI from idea to export.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

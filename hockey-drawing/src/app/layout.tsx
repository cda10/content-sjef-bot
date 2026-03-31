import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GoalGetr - Hockey Route Drawing",
  description: "Hockey route drawing prototype for coaches",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}

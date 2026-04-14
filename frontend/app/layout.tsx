import "./globals.css";
import type { Metadata } from "next";
import { Sidebar } from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "CodeMetrics — AI ROI for engineering teams",
  description:
    "Measure how much your team spends on Claude and how much it produces. Per-commit quality, tokens, and cost.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-bg text-fg antialiased">
        <div className="flex">
          <Sidebar />
          <main className="flex-1 min-h-screen bg-grid">
            <div className="max-w-7xl mx-auto px-8 py-10">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}

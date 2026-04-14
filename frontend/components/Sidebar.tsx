"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, GitCommit, LayoutDashboard, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/engineers", label: "Engineers", icon: Users },
  { href: "/commits", label: "Commits", icon: GitCommit },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-60 shrink-0 border-r border-border bg-bg-soft h-screen sticky top-0 flex flex-col">
      <div className="h-16 flex items-center px-6 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-purple-500 grid place-items-center">
            <Activity className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-sm font-semibold">CodeMetrics</div>
            <div className="text-[10px] text-fg-muted uppercase tracking-wider">
              AI ROI tracker
            </div>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-3 flex flex-col gap-1">
        {items.map((it) => {
          const active = pathname === it.href || (it.href !== "/" && pathname.startsWith(it.href));
          const Icon = it.icon;
          return (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                active
                  ? "bg-accent-soft text-fg border border-accent/30"
                  : "text-fg-muted hover:bg-bg-hover hover:text-fg"
              )}
            >
              <Icon className="w-4 h-4" />
              {it.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-border">
        <div className="text-[10px] text-fg-subtle uppercase tracking-wider mb-1">
          Status
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="w-2 h-2 rounded-full bg-good animate-pulse" />
          <span className="text-fg-muted">Ingesting commits</span>
        </div>
      </div>
    </aside>
  );
}

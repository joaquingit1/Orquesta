"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { fetchMyRepos, importRepo, logout, type AuthUser, type Repo, type ImportResponse } from "@/lib/api";

interface Props {
  user: AuthUser;
  onImported: (payload: ImportResponse) => void;
  onLoggedOut: () => void;
}

export function RepoPicker({ user, onImported, onLoggedOut }: Props) {
  const [repos, setRepos] = useState<Repo[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [importingRepo, setImportingRepo] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchMyRepos()
      .then((list) => {
        if (!cancelled) setRepos(list);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "Failed to load repos");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = (repos || []).filter((r) =>
    r.full_name.toLowerCase().includes(search.toLowerCase())
  );

  const handlePick = async (repo: Repo) => {
    setImportError(null);
    setImportingRepo(repo.full_name);
    try {
      const payload = await importRepo(repo.full_name);
      onImported(payload);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Import failed");
      setImportingRepo(null);
    }
  };

  const handleLogout = async () => {
    await logout();
    onLoggedOut();
  };

  return (
    <motion.div
      key="picker"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen flex flex-col items-center px-6 py-16"
    >
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-sm font-mono tracking-[0.3em] text-foreground/50 uppercase mb-1">
              Orquesta
            </h1>
            <div className="w-8 h-px bg-accent-cyan" />
          </div>
          <div className="flex items-center gap-3">
            {user.avatar_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatar_url}
                alt={user.login}
                className="w-8 h-8 rounded-full border border-white/10"
              />
            )}
            <div className="text-right">
              <p className="text-xs text-foreground">{user.name}</p>
              <button
                onClick={handleLogout}
                className="text-xs text-foreground/50 hover:text-foreground transition-colors cursor-pointer"
              >
                Log out
              </button>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground mb-2">
            Pick a repository
          </h2>
          <p className="text-sm text-foreground/50">
            Select one of your GitHub repos. We&apos;ll pull contributors, PRs, and commit activity.
          </p>
        </div>

        <input
          type="text"
          placeholder="Filter by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full mb-4 rounded-lg border border-card-border bg-card-bg px-4 py-2 text-sm
                     text-foreground placeholder:text-foreground/60 focus:outline-none focus:border-accent-cyan/50"
        />

        {importError && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs text-red-300">
            {importError}
          </div>
        )}

        {loadError && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {loadError}
          </div>
        )}

        {!repos && !loadError && (
          <div className="text-sm text-foreground/50">Loading repositories…</div>
        )}

        {repos && filtered.length === 0 && (
          <div className="text-sm text-foreground/50">No repos match &ldquo;{search}&rdquo;.</div>
        )}

        <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto pr-1">
          {filtered.map((repo) => {
            const isImporting = importingRepo === repo.full_name;
            const isDisabled = importingRepo !== null && !isImporting;
            return (
              <button
                key={repo.full_name}
                onClick={() => handlePick(repo)}
                disabled={isDisabled || isImporting}
                className="group flex items-start justify-between gap-4 rounded-lg border border-card-border
                           bg-card-bg px-4 py-3 text-left hover:border-accent-cyan/40 transition-colors
                           disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground truncate">
                      {repo.full_name}
                    </span>
                    {repo.private && (
                      <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded
                                       border border-muted/30 text-foreground/50">
                        private
                      </span>
                    )}
                  </div>
                  {repo.description && (
                    <p className="text-xs text-foreground/50 mt-1 line-clamp-2">{repo.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1.5 text-[11px] text-foreground/70">
                    {repo.language && <span>{repo.language}</span>}
                    <span>★ {repo.stars}</span>
                    {repo.pushed_at && <span>pushed {formatDate(repo.pushed_at)}</span>}
                  </div>
                </div>
                <div className="shrink-0 text-xs">
                  {isImporting ? (
                    <span className="text-accent-cyan">Analyzing…</span>
                  ) : (
                    <span className="text-foreground/50 group-hover:text-accent-cyan transition-colors">
                      Analyze →
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString();
  } catch {
    return iso;
  }
}

"use client";

import { motion } from "framer-motion";
import { loginUrl } from "@/lib/api";

interface Props {
  errorMessage?: string | null;
}

export function GitHubLogin({ errorMessage }: Props) {
  return (
    <motion.div
      key="login"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen flex flex-col items-center justify-center px-6 py-16"
    >
      <div className="mb-12 text-center">
        <h1 className="text-sm font-mono tracking-[0.3em] text-muted uppercase mb-1">
          Orquesta
        </h1>
        <div className="w-8 h-px bg-accent-cyan mx-auto" />
      </div>

      <div className="text-center mb-8 max-w-md">
        <h2 className="text-3xl font-semibold tracking-tight text-foreground mb-3">
          Analyze any GitHub repo
        </h2>
        <p className="text-sm text-muted leading-relaxed">
          Log in with GitHub to pick one of your repositories.
          We&apos;ll analyze contributors, commits, and PR quality with real evidence — no mocks.
        </p>
      </div>

      {errorMessage && (
        <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs text-red-300">
          {errorMessage}
        </div>
      )}

      <a
        href={loginUrl()}
        className="inline-flex items-center gap-3 rounded-full bg-foreground px-6 py-3 text-sm font-semibold
                   text-background hover:brightness-110 active:scale-[0.98] transition-all"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 .5C5.73.5.5 5.73.5 12a11.5 11.5 0 0 0 7.86 10.93c.58.1.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.88-1.54-3.88-1.54-.52-1.33-1.28-1.68-1.28-1.68-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.56-.29-5.25-1.28-5.25-5.71 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.47.11-3.06 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.77.11 3.06.74.81 1.19 1.84 1.19 3.1 0 4.44-2.7 5.41-5.27 5.7.41.35.77 1.05.77 2.12 0 1.53-.01 2.76-.01 3.13 0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5z" />
        </svg>
        Sign in with GitHub
      </a>

      <p className="mt-6 text-xs text-muted/70">
        Scope: <code className="text-muted">read:user public_repo</code> — read-only.
      </p>
    </motion.div>
  );
}

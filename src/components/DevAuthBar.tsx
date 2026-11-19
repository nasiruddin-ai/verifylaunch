"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Terminal, UserCheck, LogOut } from "lucide-react";

interface DevAuthBarProps {
  currentEmail: string | null;
  currentRole: string | null;
}

const PERSONAS = [
  {
    key: "BUYER" as const,
    label: "Buyer / Scout",
    sub: "alex@acme-ops.io",
    icon: UserCheck,
  },
  {
    key: "MAKER" as const,
    label: "Indie Maker",
    sub: "maya@bootstrapped.dev",
    icon: Terminal,
  },
  {
    key: "EDITOR" as const,
    label: "Editor",
    sub: "editor@verifylaunch.dev",
    icon: ShieldCheck,
  },
];

export function DevAuthBar({ currentEmail, currentRole }: DevAuthBarProps) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function switchPersona(persona: "BUYER" | "MAKER" | "EDITOR") {
    setBusy(persona);
    try {
      const res = await fetch("/api/auth/dev-login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ persona }),
      });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setBusy(null);
    }
  }

  async function signOut() {
    setBusy("OUT");
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="border-b border-border bg-surface-subtle text-xs text-ink-secondary">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-1.5 sm:px-6">
        <div className="flex items-center gap-2 font-mono text-[11px]">
          <span className="rounded border border-border-strong bg-surface px-1.5 py-0.5 font-medium text-ink">
            DEV AUTH
          </span>
          <span className="hidden sm:inline">
            1-click local personas (zero external API keys):
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {PERSONAS.map((p) => {
            const Icon = p.icon;
            const active = currentEmail === p.sub;
            return (
              <button
                key={p.key}
                id={`dev-persona-${p.key.toLowerCase()}`}
                type="button"
                disabled={busy !== null}
                onClick={() => switchPersona(p.key)}
                className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-[11px] font-medium transition-colors ${
                  active
                    ? "border-verified bg-verified-bg text-verified"
                    : "border-border bg-surface text-ink-secondary hover:border-border-strong hover:text-ink"
                }`}
              >
                <Icon className="h-3 w-3" />
                <span>{busy === p.key ? "Switching..." : p.label}</span>
              </button>
            );
          })}
          {currentRole && (
            <button
              id="dev-persona-signout"
              type="button"
              disabled={busy !== null}
              onClick={signOut}
              className="inline-flex items-center gap-1 rounded border border-border bg-surface px-2 py-0.5 text-[11px] text-ink-muted hover:border-border-strong hover:text-ink"
            >
              <LogOut className="h-3 w-3" />
              <span>Sign out</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

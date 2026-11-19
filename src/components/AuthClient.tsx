"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  GitBranch,
  Mail,
  ShieldCheck,
  Terminal,
  UserCheck,
} from "lucide-react";

interface AuthClientProps {
  devAuthEnabled: boolean;
  emailDeliveryConfigured: boolean;
  githubConfigured: boolean;
  currentUser: {
    name: string;
    email: string;
    role: string;
    verifiedIdentityType: string;
  } | null;
  errorCode: string | null;
}

export function AuthClient({
  devAuthEnabled,
  emailDeliveryConfigured,
  githubConfigured,
  currentUser,
  errorCode,
}: AuthClientProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [devVerifyUrl, setDevVerifyUrl] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(
    errorCode
      ? `Authentication notice: ${errorCode.replace(/_/g, " ")}.`
      : null
  );

  const canUseEmailAuth = emailDeliveryConfigured || devAuthEnabled;

  async function requestEmailLink(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    setDevVerifyUrl(null);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/auth/email/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as {
        message?: string;
        devVerifyUrl?: string;
        error?: string;
      };
      if (!res.ok) {
        setError(data.error || "Could not create verification link.");
      } else {
        setStatusMessage(data.message || "Verification link generated.");
        if (data.devVerifyUrl) setDevVerifyUrl(data.devVerifyUrl);
      }
    } finally {
      setSending(false);
    }
  }

  async function devSwitch(persona: "BUYER" | "MAKER" | "EDITOR") {
    const res = await fetch("/api/auth/dev-login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ persona }),
    });
    if (res.ok) {
      router.push("/");
      router.refresh();
    }
  }

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {currentUser && (
        <div className="editorial-card border-verified-border bg-verified-bg p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-verified">
                <CheckCircle2 className="h-4 w-4" />
                <span>Signed in as {currentUser.name}</span>
              </div>
              <p className="mt-1 font-mono text-xs text-ink-secondary">
                {currentUser.email} · Role: {currentUser.role} · Identity:{" "}
                {currentUser.verifiedIdentityType}
              </p>
            </div>
            <button
              type="button"
              onClick={signOut}
              className="rounded-md border border-border-strong bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:border-ink"
            >
              Sign out
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-md border border-danger-border bg-danger-bg px-4 py-3 text-xs font-medium text-danger">
          {error}
        </div>
      )}

      {/* Production Identity Providers */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="editorial-card p-6">
          <div className="flex items-center gap-2 font-mono text-xs uppercase text-verified">
            <Mail className="h-4 w-4" />
            <span>Work Email Verification (1.5x Signal Weight)</span>
          </div>
          <h2 className="mt-2 font-serif text-xl font-medium text-ink">
            Sign in with Email
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-ink-secondary">
            Corporate domains automatically earn a{" "}
            <strong>Verified Work Email</strong> badge on teardowns.
          </p>

          {canUseEmailAuth ? (
            <>
              <form onSubmit={requestEmailLink} className="mt-4 space-y-3">
                <input
                  id="auth-email-input"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.io"
                  className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
                />
                <button
                  id="auth-email-submit"
                  type="submit"
                  disabled={sending}
                  className="w-full rounded-md border border-ink bg-ink px-4 py-2 text-xs font-medium text-canvas hover:opacity-90 disabled:opacity-60"
                >
                  {sending
                    ? emailDeliveryConfigured
                      ? "Sending Sign-In Link..."
                      : "Generating Link..."
                    : emailDeliveryConfigured
                      ? "Send Verification Link"
                      : "Generate Instant Sign-In Link"}
                </button>
              </form>

              {statusMessage && (
                <div className="mt-3 rounded-md border border-verified-border bg-verified-bg p-3 text-xs text-ink">
                  <p>{statusMessage}</p>
                  {devVerifyUrl && (
                    <a
                      id="dev-magic-link"
                      href={devVerifyUrl}
                      className="mt-2.5 inline-flex w-full items-center justify-center rounded-md border border-verified bg-verified px-3 py-2 font-mono text-xs font-semibold text-canvas hover:opacity-90"
                    >
                      Continue &amp; Sign In →
                    </a>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="mt-4 space-y-2 rounded-md border border-border bg-surface-subtle p-3.5 text-xs text-ink-secondary">
              <p>
                <strong className="text-ink">Email delivery not configured:</strong>{" "}
                add <code>RESEND_API_KEY</code> (and optional{" "}
                <code>EMAIL_FROM</code>) in Vercel Environment Variables to send
                real verification emails.
              </p>
              <p>
                For testing/demos without an email provider, set{" "}
                <code>DEV_AUTH_MODE=true</code> in Vercel Environment Variables
                and redeploy to enable instant sign-in links and 1-click
                personas.
              </p>
            </div>
          )}
        </div>

        <div className="editorial-card p-6">
          <div className="flex items-center gap-2 font-mono text-xs uppercase text-verified">
            <GitBranch className="h-4 w-4" />
            <span>Developer Identity (1.5x Signal Weight)</span>
          </div>
          <h2 className="mt-2 font-serif text-xl font-medium text-ink">
            Sign in with GitHub
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-ink-secondary">
            Proves active engineering identity on teardowns and verifies repo
            ownership for dev-tool launches.
          </p>

          {githubConfigured ? (
            <a
              href="/api/auth/github"
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md border border-ink bg-ink px-4 py-2 text-xs font-medium text-canvas hover:opacity-90"
            >
              <GitBranch className="h-4 w-4" />
              <span>Continue with GitHub</span>
            </a>
          ) : (
            <div className="mt-4 space-y-2 rounded-md border border-border bg-surface-subtle p-3.5 text-xs text-ink-secondary">
              <p>
                <strong className="text-ink">GitHub OAuth ready for keys:</strong>{" "}
                set <code>GITHUB_CLIENT_ID</code> and{" "}
                <code>GITHUB_CLIENT_SECRET</code> in Vercel Environment
                Variables (or <code>.env.local</code>) with callback URL{" "}
                <code>/api/auth/github/callback</code>.
              </p>
              {devAuthEnabled && (
                <p>
                  You can also use the <strong>Demo Personas</strong> below in
                  the meantime.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Local Dev Mode Quick Switcher */}
      {devAuthEnabled && (
        <div className="editorial-card p-6">
          <div className="font-mono text-xs font-semibold uppercase tracking-wide text-ink">
            Local Dev Mode Personas (DEV_AUTH_MODE=true)
          </div>
          <p className="mt-1 text-xs text-ink-secondary">
            Jump straight into any end-to-end role with seeded verification
            credentials and realistic test data:
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => devSwitch("BUYER")}
              className="rounded-lg border border-border bg-canvas p-4 text-left transition-colors hover:border-ink"
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                <UserCheck className="h-4 w-4 text-verified" />
                <span>Buyer / Scout</span>
              </div>
              <p className="mt-1 font-mono text-[11px] text-ink-muted">
                alex@acme-ops.io · Work Email Verified
              </p>
              <p className="mt-1.5 text-xs text-ink-secondary">
                Test the Click-Before-Teardown unlock gate and publish weighted
                teardowns.
              </p>
            </button>

            <button
              type="button"
              onClick={() => devSwitch("MAKER")}
              className="rounded-lg border border-border bg-canvas p-4 text-left transition-colors hover:border-ink"
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                <Terminal className="h-4 w-4 text-verified" />
                <span>Indie Maker</span>
              </div>
              <p className="mt-1 font-mono text-[11px] text-ink-muted">
                maya@bootstrapped.dev · GitHub Verified
              </p>
              <p className="mt-1.5 text-xs text-ink-secondary">
                Starts at 1/2 peer teardowns; inspect HookVault&apos;s Maker
                Scorecard &amp; unlock /submit.
              </p>
            </button>

            <button
              type="button"
              onClick={() => devSwitch("EDITOR")}
              className="rounded-lg border border-border bg-canvas p-4 text-left transition-colors hover:border-ink"
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                <ShieldCheck className="h-4 w-4 text-verified" />
                <span>Editorial Reviewer</span>
              </div>
              <p className="mt-1 font-mono text-[11px] text-ink-muted">
                editor@verifylaunch.dev · Editor Role
              </p>
              <p className="mt-1.5 text-xs text-ink-secondary">
                Moderate pending submissions, reject waitlists, assign cohorts,
                and run health sweeps.
              </p>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

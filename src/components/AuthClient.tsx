"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  GitBranch,
  KeyRound,
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

type AuthTab = "signin" | "register" | "magic";

export function AuthClient({
  devAuthEnabled,
  emailDeliveryConfigured,
  githubConfigured,
  currentUser,
  errorCode,
}: AuthClientProps) {
  const router = useRouter();
  const canUseMagicLink = emailDeliveryConfigured || devAuthEnabled;

  const [tab, setTab] = useState<AuthTab>("register");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"BUYER" | "MAKER">("BUYER");
  const [submitting, setSubmitting] = useState(false);
  const [devVerifyUrl, setDevVerifyUrl] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(
    errorCode
      ? `Authentication notice: ${errorCode.replace(/_/g, " ")}.`
      : null
  );

  function switchTab(next: AuthTab) {
    setTab(next);
    setError(null);
    setStatusMessage(null);
    setDevVerifyUrl(null);
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setError(data.error || "Could not create account.");
      } else {
        router.push("/");
        router.refresh();
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setError(data.error || "Invalid email or password.");
      } else {
        router.push("/");
        router.refresh();
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function requestEmailLink(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
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
      setSubmitting(false);
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

      {/* Primary Account Access + Optional 1.5x Identity Verification */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="editorial-card p-6">
          <div className="flex items-center gap-2 font-mono text-xs uppercase text-verified">
            <KeyRound className="h-4 w-4" />
            <span>Email Account Access</span>
          </div>

          {/* Mode tabs */}
          <div className="mt-3 flex gap-1.5 rounded-md border border-border bg-canvas p-1">
            <button
              type="button"
              onClick={() => switchTab("register")}
              className={`flex-1 rounded px-2.5 py-1.5 text-xs font-medium transition-colors ${
                tab === "register"
                  ? "bg-ink text-canvas"
                  : "text-ink-secondary hover:text-ink"
              }`}
            >
              Create Account
            </button>
            <button
              type="button"
              onClick={() => switchTab("signin")}
              className={`flex-1 rounded px-2.5 py-1.5 text-xs font-medium transition-colors ${
                tab === "signin"
                  ? "bg-ink text-canvas"
                  : "text-ink-secondary hover:text-ink"
              }`}
            >
              Sign In
            </button>
            {canUseMagicLink && (
              <button
                type="button"
                onClick={() => switchTab("magic")}
                className={`flex-1 rounded px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  tab === "magic"
                    ? "bg-ink text-canvas"
                    : "text-ink-secondary hover:text-ink"
                }`}
              >
                Magic Link
              </button>
            )}
          </div>

          {tab === "register" && (
            <>
              <h2 className="mt-4 font-serif text-xl font-medium text-ink">
                Create your VerifyLaunch account
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-ink-secondary">
                Bookmark launches, test products, publish teardowns, and submit
                your own SaaS tool.
              </p>

              <form onSubmit={handleRegister} className="mt-4 space-y-3">
                <div>
                  <label
                    htmlFor="auth-name-input"
                    className="mb-1 block font-mono text-[11px] uppercase text-ink-muted"
                  >
                    Full Name
                  </label>
                  <input
                    id="auth-name-input"
                    type="text"
                    required
                    minLength={2}
                    maxLength={80}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Alex Rivera"
                    className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="auth-email-input"
                    className="mb-1 block font-mono text-[11px] uppercase text-ink-muted"
                  >
                    Email Address
                  </label>
                  <input
                    id="auth-email-input"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.io"
                    className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="auth-password-input"
                    className="mb-1 block font-mono text-[11px] uppercase text-ink-muted"
                  >
                    Password (min 8 characters)
                  </label>
                  <input
                    id="auth-password-input"
                    type="password"
                    required
                    minLength={8}
                    maxLength={128}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
                  />
                </div>

                <div>
                  <span className="mb-1 block font-mono text-[11px] uppercase text-ink-muted">
                    Primary Role
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRole("BUYER")}
                      className={`rounded-md border px-3 py-2 text-left text-xs transition-colors ${
                        role === "BUYER"
                          ? "border-ink bg-surface-subtle font-semibold text-ink"
                          : "border-border bg-canvas text-ink-secondary hover:border-border-strong"
                      }`}
                    >
                      Buyer / Explorer
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole("MAKER")}
                      className={`rounded-md border px-3 py-2 text-left text-xs transition-colors ${
                        role === "MAKER"
                          ? "border-ink bg-surface-subtle font-semibold text-ink"
                          : "border-border bg-canvas text-ink-secondary hover:border-border-strong"
                      }`}
                    >
                      Indie Maker
                    </button>
                  </div>
                </div>

                <button
                  id="auth-register-submit"
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-md border border-ink bg-ink px-4 py-2.5 text-xs font-medium text-canvas hover:opacity-90 disabled:opacity-60"
                >
                  {submitting ? "Creating Account..." : "Create Account & Sign In"}
                </button>
              </form>
            </>
          )}

          {tab === "signin" && (
            <>
              <h2 className="mt-4 font-serif text-xl font-medium text-ink">
                Welcome back
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-ink-secondary">
                Sign in with the email and password you registered with.
              </p>

              <form onSubmit={handleLogin} className="mt-4 space-y-3">
                <div>
                  <label
                    htmlFor="auth-login-email"
                    className="mb-1 block font-mono text-[11px] uppercase text-ink-muted"
                  >
                    Email Address
                  </label>
                  <input
                    id="auth-login-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.io"
                    className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="auth-login-password"
                    className="mb-1 block font-mono text-[11px] uppercase text-ink-muted"
                  >
                    Password
                  </label>
                  <input
                    id="auth-login-password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
                  />
                </div>

                <button
                  id="auth-login-submit"
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-md border border-ink bg-ink px-4 py-2.5 text-xs font-medium text-canvas hover:opacity-90 disabled:opacity-60"
                >
                  {submitting ? "Signing In..." : "Sign In"}
                </button>
              </form>
            </>
          )}

          {tab === "magic" && canUseMagicLink && (
            <>
              <h2 className="mt-4 font-serif text-xl font-medium text-ink">
                Work Email Magic Link
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-ink-secondary">
                Corporate domains automatically earn a{" "}
                <strong>Verified Work Email (1.5x)</strong> badge on teardowns.
              </p>

              <form onSubmit={requestEmailLink} className="mt-4 space-y-3">
                <input
                  id="auth-magic-email"
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
                  disabled={submitting}
                  className="w-full rounded-md border border-ink bg-ink px-4 py-2.5 text-xs font-medium text-canvas hover:opacity-90 disabled:opacity-60"
                >
                  {submitting
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
          )}
        </div>

        <div className="editorial-card flex flex-col justify-between p-6">
          <div>
            <div className="flex items-center gap-2 font-mono text-xs uppercase text-verified">
              <GitBranch className="h-4 w-4" />
              <span>Optional Trust Upgrades (1.5x Signal Weight)</span>
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
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md border border-ink bg-ink px-4 py-2.5 text-xs font-medium text-canvas hover:opacity-90"
              >
                <GitBranch className="h-4 w-4" />
                <span>Continue with GitHub</span>
              </a>
            ) : (
              <div className="mt-4 rounded-md border border-border bg-surface-subtle p-3.5 text-xs leading-relaxed text-ink-secondary">
                <strong className="text-ink">Optional for admins:</strong> add{" "}
                <code>GITHUB_CLIENT_ID</code> and{" "}
                <code>GITHUB_CLIENT_SECRET</code> in Vercel Environment
                Variables to enable 1-click GitHub OAuth (callback:{" "}
                <code>/api/auth/github/callback</code>).
              </div>
            )}
          </div>

          <div className="mt-6 rounded-md border border-border bg-canvas p-4">
            <div className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase text-ink">
              <Mail className="h-3.5 w-3.5 text-verified" />
              <span>How Teardown Weighting Works</span>
            </div>
            <ul className="mt-2 space-y-1.5 text-xs text-ink-secondary">
              <li>
                • <strong>Standard account (1.0x):</strong> Create an account on
                the left to test products, publish teardowns, and submit
                launches immediately.
              </li>
              <li>
                • <strong>Verified GitHub or Work Email (1.5x):</strong>{" "}
                Optional identity boost when GitHub OAuth or Resend email
                verification is enabled.
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Local / Demo Mode Quick Switcher */}
      {devAuthEnabled && (
        <div className="editorial-card p-6">
          <div className="font-mono text-xs font-semibold uppercase tracking-wide text-ink">
            Demo Mode Personas (DEV_AUTH_MODE=true)
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

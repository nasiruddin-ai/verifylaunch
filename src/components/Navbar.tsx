import Link from "next/link";
import { CheckCircle2, Shield } from "lucide-react";
import {
  getCurrentUser,
  getIdentityBadgeLabel,
  isDevAuthEnabled,
} from "@/lib/auth";
import { DevAuthBar } from "@/components/DevAuthBar";

export async function Navbar() {
  const user = await getCurrentUser();
  const devMode = isDevAuthEnabled();

  return (
    <div className="sticky top-0 z-30">
      {devMode && (
        <DevAuthBar
          currentEmail={user?.email ?? null}
          currentRole={user?.role ?? null}
        />
      )}
      <header className="border-b border-border bg-canvas/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-7">
            <Link
              href="/"
              className="flex items-center gap-2 text-ink transition-opacity hover:opacity-80"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-md border border-ink bg-ink font-mono text-xs font-semibold text-canvas">
                VL
              </span>
              <span className="font-serif text-xl font-medium tracking-tight">
                VerifyLaunch
              </span>
            </Link>

            <nav
              aria-label="Primary"
              className="hidden items-center gap-5 text-sm font-medium text-ink-secondary md:flex"
            >
              <Link
                href="/"
                className="transition-colors hover:text-ink"
              >
                Weekly Drop
              </Link>
              <Link
                href="/directory"
                className="transition-colors hover:text-ink"
              >
                Directory
              </Link>
              <Link
                href="/submit"
                className="transition-colors hover:text-ink"
              >
                Submit
              </Link>
              <Link
                href="/maker"
                className="transition-colors hover:text-ink"
              >
                Maker Scorecard
              </Link>
              {user?.role === "EDITOR" && (
                <Link
                  href="/admin/review"
                  className="inline-flex items-center gap-1.5 text-verified transition-opacity hover:opacity-80"
                >
                  <Shield className="h-3.5 w-3.5" />
                  <span>Review Queue</span>
                </Link>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <Link
                href="/auth"
                className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-border-strong"
              >
                {user.verifiedIdentityType !== "NONE" && (
                  <CheckCircle2 className="h-3.5 w-3.5 text-verified" />
                )}
                <span>{user.name}</span>
                <span className="hidden font-mono text-[10px] text-ink-muted sm:inline">
                  {getIdentityBadgeLabel(
                    user.verifiedIdentityType,
                    user.githubUsername,
                    user.workDomain
                  )}
                </span>
              </Link>
            ) : (
              <Link
                href="/auth"
                id="nav-sign-in"
                className="inline-flex items-center rounded-md border border-ink bg-ink px-3.5 py-1.5 text-xs font-medium text-canvas transition-opacity hover:opacity-90"
              >
                Sign in &amp; Verify
              </Link>
            )}
          </div>
        </div>

        {/* Mobile navigation row */}
        <div className="flex items-center gap-4 overflow-x-auto border-t border-border px-4 py-2 text-xs font-medium text-ink-secondary md:hidden">
          <Link href="/" className="whitespace-nowrap hover:text-ink">
            Weekly Drop
          </Link>
          <Link href="/directory" className="whitespace-nowrap hover:text-ink">
            Directory
          </Link>
          <Link href="/submit" className="whitespace-nowrap hover:text-ink">
            Submit
          </Link>
          <Link href="/maker" className="whitespace-nowrap hover:text-ink">
            Scorecard
          </Link>
          {user?.role === "EDITOR" && (
            <Link
              href="/admin/review"
              className="whitespace-nowrap text-verified"
            >
              Review Queue
            </Link>
          )}
        </div>
      </header>
    </div>
  );
}

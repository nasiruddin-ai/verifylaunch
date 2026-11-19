import type { Metadata } from "next";
import {
  getCurrentUser,
  isDevAuthEnabled,
  isGitHubOAuthConfigured,
} from "@/lib/auth";
import { AuthClient } from "@/components/AuthClient";

export const metadata: Metadata = {
  title: "Sign In & Verify Identity",
  description:
    "Authenticate with GitHub, verified work email, or local dev mode personas on VerifyLaunch.",
};

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const errorParam = Array.isArray(sp.error) ? sp.error[0] : sp.error ?? null;
  const user = await getCurrentUser();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <header className="mb-8">
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-verified">
          Identity &amp; Reviewer Trust
        </p>
        <h1 className="mt-1.5 font-serif text-3xl font-medium tracking-tight text-ink sm:text-4xl">
          Sign in &amp; Verify Identity
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-secondary">
          VerifyLaunch weights teardowns by verified GitHub and corporate
          work-email identities to make anonymous upvote rings economically
          pointless.
        </p>
      </header>

      <AuthClient
        devAuthEnabled={isDevAuthEnabled()}
        githubConfigured={isGitHubOAuthConfigured()}
        currentUser={
          user
            ? {
                name: user.name,
                email: user.email,
                role: user.role,
                verifiedIdentityType: user.verifiedIdentityType,
              }
            : null
        }
        errorCode={errorParam}
      />
    </div>
  );
}

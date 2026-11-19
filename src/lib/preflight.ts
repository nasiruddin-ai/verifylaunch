export type PreflightCheckStatus = "pass" | "warn" | "fail";

export interface PreflightCheckItem {
  id: string;
  label: string;
  status: PreflightCheckStatus;
  detail: string;
}

export interface PreflightReport {
  passed: boolean;
  checkedAt: string;
  httpStatus: number | null;
  responseTimeMs: number | null;
  pricingReachable: boolean;
  waitlistSuspected: boolean;
  githubActiveWithin90d: boolean | null;
  checks: PreflightCheckItem[];
}

export interface PreflightInput {
  websiteUrl: string;
  tryNowUrl: string;
  pricingUrl: string;
  githubRepoUrl?: string | null;
}

type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit
) => Promise<Response>;

const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\.0\.0\.0$/,
  /^::1$/,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /\.local$/i,
  /\.internal$/i,
];

const WAITLIST_ONLY_PATTERNS = [
  /join\s+(the\s+)?waitlist/i,
  /coming\s+soon/i,
  /request\s+early\s+access/i,
  /get\s+notified\s+when\s+we\s+launch/i,
  /invite[\s-]only\s+beta/i,
];

const LIVE_PRODUCT_CUES = [
  /sign\s*in/i,
  /log\s*in/i,
  /start\s+(your\s+)?free/i,
  /get\s+started/i,
  /pricing/i,
  /documentation/i,
  /dashboard/i,
  /open\s+app/i,
  /try\s+it/i,
];

export function validatePublicHttpsUrl(rawUrl: string): {
  valid: boolean;
  url?: URL;
  reason?: string;
} {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    return { valid: false, reason: "Invalid URL syntax" };
  }

  if (parsed.protocol !== "https:") {
    return { valid: false, reason: "Must use HTTPS" };
  }

  const hostname = parsed.hostname.toLowerCase();
  if (PRIVATE_HOST_PATTERNS.some((pattern) => pattern.test(hostname))) {
    return {
      valid: false,
      reason: "Private, loopback, or local hostnames are blocked",
    };
  }

  if (!hostname.includes(".")) {
    return { valid: false, reason: "Hostname must be a public domain" };
  }

  return { valid: true, url: parsed };
}

export function detectWaitlistOnlyHtml(html: string): boolean {
  const sample = html.slice(0, 24000);
  const hasWaitlistPhrase = WAITLIST_ONLY_PATTERNS.some((p) => p.test(sample));
  if (!hasWaitlistPhrase) return false;

  const liveCueMatches = LIVE_PRODUCT_CUES.filter((p) => p.test(sample)).length;
  // Waitlist phrase with fewer than 2 live-app cues strongly signals a pre-launch landing page.
  return liveCueMatches < 2;
}

export function parseGitHubRepoSlug(repoUrl: string): string | null {
  const check = validatePublicHttpsUrl(repoUrl);
  if (!check.valid || !check.url) return null;
  if (check.url.hostname.toLowerCase() !== "github.com") return null;
  const parts = check.url.pathname.split("/").filter(Boolean);
  if (parts.length < 2) return null;
  return `${parts[0]}/${parts[1].replace(/\.git$/i, "")}`;
}

async function probeUrl(
  url: string,
  fetchFn: FetchLike,
  timeoutMs = 4000
): Promise<{
  ok: boolean;
  status: number | null;
  latencyMs: number;
  snippet: string;
  error?: string;
}> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = Date.now();
  try {
    const res = await fetchFn(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": "VerifyLaunch-Preflight/1.0 (+https://verifylaunch.dev)",
        accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
      },
    });
    const latencyMs = Date.now() - started;
    let snippet = "";
    try {
      snippet = (await res.text()).slice(0, 24000);
    } catch {
      snippet = "";
    }
    return {
      ok: res.status >= 200 && res.status < 400,
      status: res.status,
      latencyMs,
      snippet,
    };
  } catch (err) {
    return {
      ok: false,
      status: null,
      latencyMs: Date.now() - started,
      snippet: "",
      error: err instanceof Error ? err.message : "Network error",
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function runPreflightCheck(
  input: PreflightInput,
  options?: {
    fetchFn?: FetchLike;
    timeoutMs?: number;
    skipNetworkProbe?: boolean;
  }
): Promise<PreflightReport> {
  const fetchFn: FetchLike = options?.fetchFn ?? fetch;
  const timeoutMs = options?.timeoutMs ?? 4000;
  const checkedAt = new Date().toISOString();
  const checks: PreflightCheckItem[] = [];

  const siteCheck = validatePublicHttpsUrl(input.websiteUrl);
  const tryCheck = validatePublicHttpsUrl(input.tryNowUrl);
  const pricingCheck = validatePublicHttpsUrl(input.pricingUrl);

  if (!siteCheck.valid || !tryCheck.valid) {
    checks.push({
      id: "url_hygiene",
      label: "Public HTTPS product & try-now URLs",
      status: "fail",
      detail:
        siteCheck.reason ??
        tryCheck.reason ??
        "Website and Try-Now URLs must be valid public HTTPS URLs.",
    });
  } else {
    checks.push({
      id: "url_hygiene",
      label: "Public HTTPS product & try-now URLs",
      status: "pass",
      detail: `Validated ${siteCheck.url!.hostname} and live entry path.`,
    });
  }

  if (!pricingCheck.valid) {
    checks.push({
      id: "pricing_url",
      label: "Public transparent pricing URL",
      status: "fail",
      detail: pricingCheck.reason ?? "Pricing URL must be a valid public HTTPS URL.",
    });
  }

  let httpStatus: number | null = null;
  let responseTimeMs: number | null = null;
  let pricingReachable = false;
  let waitlistSuspected = false;
  let githubActiveWithin90d: boolean | null = null;

  if (options?.skipNetworkProbe) {
    if (siteCheck.valid && tryCheck.valid) {
      httpStatus = 200;
      responseTimeMs = 120;
      checks.push({
        id: "live_probe",
        label: "Live product reachability",
        status: "pass",
        detail: "Simulated live probe passed in offline verification mode.",
      });
    }
    if (pricingCheck.valid) {
      pricingReachable = true;
      checks.push({
        id: "pricing_probe",
        label: "Pricing page reachability",
        status: "pass",
        detail: "Simulated pricing probe passed in offline verification mode.",
      });
    }
  } else {
    if (tryCheck.valid) {
      const liveProbe = await probeUrl(input.tryNowUrl, fetchFn, timeoutMs);
      httpStatus = liveProbe.status;
      responseTimeMs = liveProbe.latencyMs;

      if (liveProbe.ok) {
        checks.push({
          id: "live_probe",
          label: "Live product reachability",
          status: "pass",
          detail: `HTTP ${liveProbe.status} in ${liveProbe.latencyMs}ms.`,
        });
        waitlistSuspected = detectWaitlistOnlyHtml(liveProbe.snippet);
        checks.push({
          id: "waitlist_scan",
          label: "Usable today (anti-waitlist scan)",
          status: waitlistSuspected ? "fail" : "pass",
          detail: waitlistSuspected
            ? "Detected waitlist/coming-soon phrasing without live app entry cues."
            : "No waitlist-only gate detected on entry page.",
        });
      } else {
        checks.push({
          id: "live_probe",
          label: "Live product reachability",
          status: "warn",
          detail: liveProbe.status
            ? `Returned HTTP ${liveProbe.status}; editor will manually verify.`
            : `Probe timed out or blocked (${liveProbe.error ?? "unreachable"}); editor will manually verify.`,
        });
      }
    }

    if (pricingCheck.valid) {
      const priceProbe = await probeUrl(input.pricingUrl, fetchFn, timeoutMs);
      pricingReachable = priceProbe.ok;
      checks.push({
        id: "pricing_probe",
        label: "Public transparent pricing page",
        status: priceProbe.ok ? "pass" : "warn",
        detail: priceProbe.ok
          ? `Pricing page reachable (HTTP ${priceProbe.status}).`
          : `Could not confirm pricing page automatically (${priceProbe.status ?? priceProbe.error ?? "unreachable"}).`,
      });
    }

    if (input.githubRepoUrl && input.githubRepoUrl.trim().length > 0) {
      const slug = parseGitHubRepoSlug(input.githubRepoUrl);
      if (!slug) {
        checks.push({
          id: "github_repo",
          label: "GitHub repository freshness",
          status: "warn",
          detail: "Could not parse public GitHub owner/repo URL.",
        });
      } else {
        const ghRes = await probeUrl(
          `https://api.github.com/repos/${slug}`,
          fetchFn,
          timeoutMs
        );
        if (ghRes.ok && ghRes.snippet) {
          try {
            const parsed = JSON.parse(ghRes.snippet) as { pushed_at?: string };
            if (parsed.pushed_at) {
              const pushedMs = new Date(parsed.pushed_at).getTime();
              const ageDays = Math.floor(
                (Date.now() - pushedMs) / (1000 * 60 * 60 * 24)
              );
              githubActiveWithin90d = ageDays <= 90;
              checks.push({
                id: "github_repo",
                label: "GitHub repository freshness",
                status: githubActiveWithin90d ? "pass" : "warn",
                detail: `Last commit ${ageDays}d ago on ${slug}.`,
              });
            }
          } catch {
            checks.push({
              id: "github_repo",
              label: "GitHub repository freshness",
              status: "warn",
              detail: "GitHub API response could not be parsed.",
            });
          }
        } else {
          checks.push({
            id: "github_repo",
            label: "GitHub repository freshness",
            status: "warn",
            detail: "GitHub repo metadata unavailable during automated probe.",
          });
        }
      }
    }
  }

  const hasHardFailure = checks.some((c) => c.status === "fail");

  return {
    passed: !hasHardFailure,
    checkedAt,
    httpStatus,
    responseTimeMs,
    pricingReachable,
    waitlistSuspected,
    githubActiveWithin90d,
    checks,
  };
}

export function parsePreflightReport(
  json: string | null | undefined
): PreflightReport | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as PreflightReport;
  } catch {
    return null;
  }
}

import { describe, expect, it } from "vitest";
import {
  detectWaitlistOnlyHtml,
  runPreflightCheck,
  validatePublicHttpsUrl,
} from "@/lib/preflight";

describe("Anti-Slop Pre-Flight Validator", () => {
  it("blocks non-HTTPS and private/SSRF hostnames", () => {
    expect(validatePublicHttpsUrl("http://example.com").valid).toBe(false);
    expect(validatePublicHttpsUrl("https://localhost:3000").valid).toBe(false);
    expect(validatePublicHttpsUrl("https://127.0.0.1/admin").valid).toBe(false);
    expect(validatePublicHttpsUrl("https://192.168.1.10").valid).toBe(false);
    expect(validatePublicHttpsUrl("https://169.254.169.254/latest").valid).toBe(false);
    expect(validatePublicHttpsUrl("https://ledgerflow.app").valid).toBe(true);
  });

  it("flags waitlist-only landing pages while allowing live apps", () => {
    const waitlistHtml =
      "<html><title>Stealth AI</title><body><h1>Coming Soon</h1><p>Join the waitlist for early access.</p></body></html>";
    const liveAppHtml =
      "<html><title>CronPulse</title><body><a href='/login'>Sign in</a><a href='/pricing'>Pricing</a><button>Start your free trial</button></body></html>";

    expect(detectWaitlistOnlyHtml(waitlistHtml)).toBe(true);
    expect(detectWaitlistOnlyHtml(liveAppHtml)).toBe(false);
  });

  it("passes live products with reachable pricing and flags waitlist pages", async () => {
    const liveFetch = async (url: string | URL | Request) => {
      const target = String(url);
      if (target.includes("pricing")) {
        return new Response("<html><body>Pricing $19/mo Start your free trial</body></html>", {
          status: 200,
        });
      }
      return new Response(
        "<html><body><a href='/login'>Sign in</a><a href='/pricing'>Pricing</a><a href='/app'>Open app</a></body></html>",
        { status: 200 }
      );
    };

    const okReport = await runPreflightCheck(
      {
        websiteUrl: "https://cronpulse.dev",
        tryNowUrl: "https://app.cronpulse.dev/sandbox",
        pricingUrl: "https://cronpulse.dev/pricing",
      },
      { fetchFn: liveFetch }
    );

    expect(okReport.passed).toBe(true);
    expect(okReport.pricingReachable).toBe(true);
    expect(okReport.waitlistSuspected).toBe(false);

    const waitlistFetch = async () =>
      new Response(
        "<html><body><h1>Stealth Launch</h1><p>Join the waitlist — coming soon!</p></body></html>",
        { status: 200 }
      );

    const failReport = await runPreflightCheck(
      {
        websiteUrl: "https://stealthwrapper.ai",
        tryNowUrl: "https://stealthwrapper.ai",
        pricingUrl: "https://stealthwrapper.ai/pricing",
      },
      { fetchFn: waitlistFetch }
    );

    expect(failReport.passed).toBe(false);
    expect(failReport.waitlistSuspected).toBe(true);
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { isEmailDeliveryConfigured, sendMagicLinkEmail } from "../email";

describe("email delivery helper", () => {
  const originalKey = process.env.RESEND_API_KEY;
  const originalFrom = process.env.EMAIL_FROM;

  afterEach(() => {
    if (originalKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalKey;
    if (originalFrom === undefined) delete process.env.EMAIL_FROM;
    else process.env.EMAIL_FROM = originalFrom;
    vi.restoreAllMocks();
  });

  it("reports unconfigured when RESEND_API_KEY is missing or blank", () => {
    delete process.env.RESEND_API_KEY;
    expect(isEmailDeliveryConfigured()).toBe(false);

    process.env.RESEND_API_KEY = "   ";
    expect(isEmailDeliveryConfigured()).toBe(false);

    process.env.RESEND_API_KEY = "re_test_123";
    expect(isEmailDeliveryConfigured()).toBe(true);
  });

  it("sends a Resend API request when configured and returns provider errors cleanly", async () => {
    process.env.RESEND_API_KEY = "re_test_123";
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "email_1" }), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: "Domain not verified" }), {
          status: 403,
        })
      );

    const okResult = await sendMagicLinkEmail({
      to: "founder@acme.io",
      verifyUrl: "https://verifylaunch.vercel.app/api/auth/email/verify?token=abc",
      workDomain: "acme.io",
    });
    expect(okResult).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const failResult = await sendMagicLinkEmail({
      to: "founder@acme.io",
      verifyUrl: "https://verifylaunch.vercel.app/api/auth/email/verify?token=abc",
      workDomain: "acme.io",
    });
    expect(failResult).toEqual({ ok: false, error: "Domain not verified" });
  });
});

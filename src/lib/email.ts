export function isEmailDeliveryConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export async function sendMagicLinkEmail(params: {
  to: string;
  verifyUrl: string;
  workDomain: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, error: "RESEND_API_KEY is not configured." };
  }

  const from =
    process.env.EMAIL_FROM?.trim() || "VerifyLaunch <onboarding@resend.dev>";

  const badgeNote = params.workDomain
    ? `Signing in with @${params.workDomain} grants a Verified Work Email badge (1.5x teardown weight).`
    : "Sign in to evaluate launches, bookmark tools, and submit teardowns on VerifyLaunch.";

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; color: #18181b; background: #faf9f6;">
      <p style="font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: #166534; margin: 0 0 12px;">
        VerifyLaunch · Sign-In Verification
      </p>
      <h1 style="font-family: Georgia, serif; font-size: 24px; font-weight: 500; margin: 0 0 12px; color: #18181b;">
        Your sign-in link is ready
      </h1>
      <p style="font-size: 14px; line-height: 1.6; color: #52525b; margin: 0 0 24px;">
        ${badgeNote}
      </p>
      <a href="${params.verifyUrl}" style="display: inline-block; background: #18181b; color: #faf9f6; text-decoration: none; font-size: 14px; font-weight: 500; padding: 12px 20px; border-radius: 6px;">
        Sign in to VerifyLaunch →
      </a>
      <p style="font-size: 12px; line-height: 1.5; color: #71717a; margin: 24px 0 0;">
        This single-use link expires in 20 minutes. If you didn&apos;t request it, you can safely ignore this email.
      </p>
    </div>
  `.trim();

  const text = [
    "VerifyLaunch — Sign-In Verification",
    "",
    badgeNote,
    "",
    `Sign in here (expires in 20 minutes): ${params.verifyUrl}`,
    "",
    "If you didn't request this link, you can safely ignore this email.",
  ].join("\n");

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [params.to],
        subject: "Sign in to VerifyLaunch",
        html,
        text,
      }),
    });

    if (!res.ok) {
      const errBody = (await res.json().catch(() => null)) as {
        message?: string;
        name?: string;
      } | null;
      return {
        ok: false,
        error:
          errBody?.message ||
          `Email provider rejected the request (HTTP ${res.status}).`,
      };
    }

    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : "Network error while contacting email provider.",
    };
  }
}

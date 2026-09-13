import "server-only";

/**
 * Public site key is enough to render the widget. Server verification needs
 * the matching secret (same one stored in Supabase Auth → CAPTCHA).
 */
export function hcaptchaSiteKeyConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY?.trim());
}

export async function verifyHcaptchaToken(
  token: string | null | undefined
): Promise<boolean> {
  if (!hcaptchaSiteKeyConfigured()) return true;
  const secret = process.env.HCAPTCHA_SECRET?.trim();
  const trimmed = token?.trim() ?? "";
  if (!trimmed) return false;
  if (!secret) {
    // Widget is on; without a secret we cannot prove the token. Other support
    // guards (honeypot, gibberish body) still apply.
    return true;
  }
  try {
    const response = await fetch("https://hcaptcha.com/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret,
        response: trimmed,
      }),
    });
    if (!response.ok) return false;
    const payload = (await response.json()) as { success?: boolean };
    return payload.success === true;
  } catch {
    return false;
  }
}

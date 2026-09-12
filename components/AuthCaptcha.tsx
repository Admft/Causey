"use client";

import HCaptcha from "@hcaptcha/react-hcaptcha";

export const AUTH_CAPTCHA_ENABLED = Boolean(
  process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY
);
export const CAPTCHA_REQUIRED_MESSAGE = "Complete the security check.";

export function AuthCaptcha({
  onTokenChange,
}: {
  onTokenChange: (token: string | null) => void;
}) {
  const siteKey = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY;
  if (!siteKey) return null;

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-semibold text-muted-strong">
        Security check
      </span>
      <HCaptcha
        sitekey={siteKey}
        onVerify={(token) => onTokenChange(token)}
        onExpire={() => onTokenChange(null)}
        onChalExpired={() => onTokenChange(null)}
        onError={() => onTokenChange(null)}
      />
    </div>
  );
}

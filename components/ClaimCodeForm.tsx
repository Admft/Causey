"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ACTIVATION_CODE_LENGTH,
  isValidActivationCode,
  normalizeActivationCode,
} from "@/lib/invitations/activation-code";

export function ClaimCodeForm({ initialCode = "" }: { initialCode?: string }) {
  const router = useRouter();
  const [code, setCode] = useState(initialCode);
  const [error, setError] = useState<string | null>(null);
  // A navigation is the only work here, so let the transition own the busy
  // state. A manual flag had nothing to reset it and the button stayed dead.
  const [pending, startTransition] = useTransition();

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const normalized = normalizeActivationCode(code);
    if (!isValidActivationCode(normalized)) {
      setError(
        `Activation codes are ${ACTIVATION_CODE_LENGTH} letters and numbers.`
      );
      return;
    }
    setError(null);
    startTransition(() => {
      router.push(`/claim?code=${encodeURIComponent(normalized)}`);
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-muted-strong">
          Activation code
        </span>
        <input
          className="field font-mono tracking-[0.18em] uppercase"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="BCDF-GHJK"
          aria-describedby="activation-code-help"
        />
        <span id="activation-code-help" className="text-xs text-muted">
          Dashes and spaces are fine. The code only works for the email address
          it was sent to.
        </span>
      </label>

      {error ? (
        <p className="text-sm font-medium text-brand-red" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="cta-enabled w-fit disabled:opacity-60"
      >
        {pending ? "Checking…" : "Continue"}
      </button>
    </form>
  );
}

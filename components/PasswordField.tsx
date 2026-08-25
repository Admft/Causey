"use client";

import { useId, useState } from "react";

export function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
  required,
  minLength,
  name,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: "current-password" | "new-password";
  required?: boolean;
  minLength?: number;
  name?: string;
}) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const action = visible ? "Hide" : "Show";

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-semibold text-muted-strong">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          className="field field-password"
          type={visible ? "text" : "password"}
          required={required}
          minLength={minLength}
          name={name}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
        />
        <button
          type="button"
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-muted-strong hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20"
          aria-label={`${action} ${label.toLowerCase()}`}
          aria-pressed={visible}
          aria-controls={id}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
    </div>
  );
}

function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M1.5 8s2.5-4.5 6.5-4.5S14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M2 2l12 12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M6.6 6.7A2 2 0 008 10a2 2 0 001.4-.6M4.2 4.4A9.4 9.4 0 001.5 8s2.5 4.5 6.5 4.5c1.1 0 2.1-.3 3-.8M11.8 11.6A9.4 9.4 0 0014.5 8s-2.5-4.5-6.5-4.5c-.7 0-1.4.1-2 .4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

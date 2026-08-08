"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";

export type AccountSettingsPanelId =
  | "profile"
  | "signin"
  | "alerts"
  | "family"
  | "organizations";

type Panel = {
  id: AccountSettingsPanelId;
  label: string;
  content: ReactNode;
};

function panelFromHash(
  hash: string,
  panels: Panel[]
): AccountSettingsPanelId {
  const id = hash.replace(/^#/, "") as AccountSettingsPanelId;
  if (panels.some((panel) => panel.id === id)) return id;
  return panels[0]?.id ?? "profile";
}

/**
 * One settings job visible at a time. Hash deep-links (#alerts, #family)
 * select the matching panel without dumping the whole page.
 */
export function AccountSettingsShell({ panels }: { panels: Panel[] }) {
  const [active, setActive] = useState<AccountSettingsPanelId>(
    () => panels[0]?.id ?? "profile"
  );

  const panelIds = panels.map((panel) => panel.id).join(",");

  useEffect(() => {
    function syncFromHash() {
      setActive(panelFromHash(window.location.hash, panels));
    }
    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
    // panelIds tracks which segments exist; content swaps with the active panel.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- panels content is RSC slots
  }, [panelIds]);

  function select(id: AccountSettingsPanelId) {
    setActive(id);
    const next = `#${id}`;
    if (window.location.hash !== next) {
      window.history.replaceState(null, "", next);
    }
  }

  const current = panels.find((panel) => panel.id === active) ?? panels[0];

  return (
    <div className="mt-8 lg:grid lg:grid-cols-[11rem_minmax(0,1fr)] lg:gap-10">
      <nav
        aria-label="Settings sections"
        className="flex gap-1 overflow-x-auto border-b border-line pb-2.5 lg:hidden"
      >
        {panels.map((panel) => {
          const isActive = panel.id === active;
          return (
            <button
              key={panel.id}
              type="button"
              onClick={() => select(panel.id)}
              aria-current={isActive ? "page" : undefined}
              className={
                isActive
                  ? "inline-flex shrink-0 items-center rounded-md border border-brand-red/25 bg-accent-soft px-2.5 py-1 text-sm font-semibold text-brand-red"
                  : "inline-flex shrink-0 items-center rounded-md px-2.5 py-1 text-sm font-medium text-muted-strong transition-colors hover:bg-white hover:text-foreground"
              }
            >
              {panel.label}
            </button>
          );
        })}
      </nav>

      <nav
        aria-label="Settings sections"
        className="hidden lg:block lg:border-r lg:border-line"
      >
        <div className="sticky top-6 grid gap-0.5 pr-6">
          {panels.map((panel) => {
            const isActive = panel.id === active;
            return (
              <button
                key={panel.id}
                type="button"
                onClick={() => select(panel.id)}
                aria-current={isActive ? "page" : undefined}
                className={
                  isActive
                    ? "rounded-md bg-accent-soft px-3 py-2 text-left text-sm font-semibold text-brand-red"
                    : "rounded-md px-3 py-2 text-left text-sm font-medium text-muted-strong transition-colors hover:bg-surface-soft hover:text-foreground"
                }
              >
                {panel.label}
              </button>
            );
          })}
        </div>
      </nav>

      <div className="mt-8 lg:mt-0" id={current?.id} role="tabpanel">
        {current?.content}
      </div>
    </div>
  );
}

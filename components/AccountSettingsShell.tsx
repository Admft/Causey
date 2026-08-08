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
    <div className="mt-8">
      <nav
        aria-label="Settings sections"
        className="flex flex-wrap gap-x-5 gap-y-2 border-b border-line"
      >
        {panels.map((panel) => {
          const isActive = panel.id === active;
          return (
            <button
              key={panel.id}
              type="button"
              onClick={() => select(panel.id)}
              aria-current={isActive ? "page" : undefined}
              className={`-mb-px border-b-2 pb-2 text-sm transition-colors ${
                isActive
                  ? "border-brand-red font-semibold text-brand-red"
                  : "border-transparent font-medium text-muted-strong hover:text-foreground"
              }`}
            >
              {panel.label}
            </button>
          );
        })}
      </nav>

      <div className="mt-8" id={current?.id} role="tabpanel">
        {current?.content}
      </div>
    </div>
  );
}

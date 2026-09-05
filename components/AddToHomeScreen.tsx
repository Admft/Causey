"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  ADD_TO_HOME_SCREEN_EVENT,
  detectHomeScreenKind,
  homeScreenBrowserGate,
  homeScreenPromptCopy,
  homeScreenTutorial,
  readHomeScreenEnvironment,
  shouldOfferAddToHomeScreen,
  type BeforeInstallPromptEvent,
  type HomeScreenKind,
} from "@/lib/add-to-home-screen";

function ShareMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="inline-block h-4 w-4 align-[-0.125em] text-brand-red"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M12 4v11"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M8.5 7.5 12 4l3.5 3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 12.5v5.25A1.75 1.75 0 0 0 7.75 19.5h8.5A1.75 1.75 0 0 0 18 17.75V12.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function stepShowsShareIcon(title: string) {
  return title === "Share";
}

/**
 * Phone/tablet Home Screen install. Android Chrome can prompt natively when
 * the browser fires `beforeinstallprompt`; iOS Safari cannot, so we walk
 * Share → Add to Home Screen.
 */
export function AddToHomeScreen() {
  const titleId = useId();
  const dialogId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const installEventRef = useRef<BeforeInstallPromptEvent | null>(null);
  const addRef = useRef<() => void>(() => {});
  const [kind, setKind] = useState<HomeScreenKind | null>(null);
  const [canPrompt, setCanPrompt] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);

  async function addToHomeScreen() {
    const env = readHomeScreenEnvironment();
    if (!shouldOfferAddToHomeScreen(env)) return;
    const nextKind = detectHomeScreenKind(
      env.userAgent,
      env.platform,
      env.maxTouchPoints
    );
    setKind(nextKind);

    const promptEvent = installEventRef.current;
    if (promptEvent) {
      installEventRef.current = null;
      setCanPrompt(false);
      try {
        await promptEvent.prompt();
        await promptEvent.userChoice;
        setTutorialOpen(false);
        return;
      } catch {
        // Chromium can reject if the gesture is gone; show the menu steps.
      }
    }
    setTutorialOpen(true);
  }
  addRef.current = () => {
    void addToHomeScreen();
  };

  useEffect(() => {
    const env = readHomeScreenEnvironment();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- UA/standalone only exist on the client
    setKind(
      shouldOfferAddToHomeScreen(env)
        ? detectHomeScreenKind(env.userAgent, env.platform, env.maxTouchPoints)
        : "desktop"
    );

    function onPrompt(event: Event) {
      event.preventDefault();
      installEventRef.current = event as BeforeInstallPromptEvent;
      setCanPrompt(true);
    }
    function onInstalled() {
      installEventRef.current = null;
      setCanPrompt(false);
      setKind("desktop");
      setTutorialOpen(false);
    }
    function onRequest() {
      addRef.current();
    }
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener(ADD_TO_HOME_SCREEN_EVENT, onRequest);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener(ADD_TO_HOME_SCREEN_EVENT, onRequest);
    };
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (tutorialOpen && !dialog.open) {
      dialog.showModal();
    } else if (!tutorialOpen && dialog.open) {
      dialog.close();
    }
  }, [tutorialOpen]);

  const offer = kind !== null && kind !== "desktop";
  const gate =
    offer && kind
      ? homeScreenBrowserGate(
          typeof navigator === "undefined" ? "" : navigator.userAgent,
          kind
        )
      : "ok";
  const copy = offer && kind ? homeScreenPromptCopy(kind) : null;
  const tutorial = offer && kind ? homeScreenTutorial(kind, gate) : null;

  return (
    <>
      {copy ? (
        <section className="border-b border-line px-5 py-5 sm:px-8">
          <div className="mx-auto max-w-6xl border-l-2 border-brand-red pl-4 sm:pl-5">
            <h2 className="font-display text-lead font-bold text-foreground">
              {copy.heading}
            </h2>
            <p className="mt-2 max-w-prose text-sm text-muted">{copy.body}</p>
            <button
              type="button"
              className="cta-enabled mt-4 w-full sm:w-auto"
              aria-haspopup={canPrompt ? undefined : "dialog"}
              aria-controls={canPrompt ? undefined : dialogId}
              onClick={() => void addToHomeScreen()}
            >
              {copy.action}
            </button>
          </div>
        </section>
      ) : null}

      <dialog
        ref={dialogRef}
        id={dialogId}
        className="home-screen-dialog"
        aria-labelledby={titleId}
        onClose={() => setTutorialOpen(false)}
      >
        {tutorial ? (
          <>
            <h2
              id={titleId}
              className="font-display text-xl font-bold text-foreground"
            >
              {tutorial.title}
            </h2>
            <p className="mt-2 text-sm text-muted">{tutorial.lead}</p>
            <ol className="mt-5 flex flex-col gap-4">
              {tutorial.steps.map((step, index) => (
                <li key={step.title} className="flex gap-3">
                  <span
                    aria-hidden="true"
                    className="mt-0.5 w-5 shrink-0 text-xs font-bold tabular-nums tracking-wide text-brand-red"
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-foreground">
                      {step.title}
                      {stepShowsShareIcon(step.title) ? (
                        <>
                          {" "}
                          <ShareMark />
                        </>
                      ) : null}
                    </span>
                    <span className="mt-1 block text-sm text-muted">
                      {step.body}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
            <p className="mt-5 text-xs text-muted">{tutorial.note}</p>
            <button
              type="button"
              className="cta-enabled mt-5 w-full"
              onClick={() => setTutorialOpen(false)}
            >
              Got it
            </button>
          </>
        ) : null}
      </dialog>
    </>
  );
}

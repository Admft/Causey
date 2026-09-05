/**
 * Home Screen install targeting. iOS has no install API — Safari needs a
 * Share → Add to Home Screen walkthrough. Chromium on Android can prompt
 * when `beforeinstallprompt` fires.
 */

export const ADD_TO_HOME_SCREEN_EVENT = "causey:add-to-home-screen";

export type HomeScreenKind =
  | "iphone"
  | "ipad"
  | "android"
  | "other-mobile"
  | "desktop";

export type HomeScreenGate = "ok" | "use-safari" | "use-browser";

export type HomeScreenEnvironment = {
  userAgent: string;
  platform: string;
  maxTouchPoints: number;
  standalone: boolean;
};

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export type HomeScreenStep = {
  title: string;
  body: string;
};

export type HomeScreenTutorial = {
  title: string;
  lead: string;
  steps: HomeScreenStep[];
  note: string;
};

const IN_APP_BROWSER =
  /FBAN|FBAV|FB_IAB|Instagram|Line\/|Twitter|Snapchat|WhatsApp|Messenger/i;
const IOS_NON_SAFARI = /CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo\/iOS/i;

export function isStandaloneDisplay(
  standaloneFlag: boolean,
  displayModeStandalone: boolean,
  displayModeFullscreen = false,
  displayModeMinimalUi = false
): boolean {
  return (
    standaloneFlag ||
    displayModeStandalone ||
    displayModeFullscreen ||
    displayModeMinimalUi
  );
}

export function detectHomeScreenKind(
  userAgent: string,
  platform: string,
  maxTouchPoints: number
): HomeScreenKind {
  if (/iPhone|iPod/i.test(userAgent)) return "iphone";
  if (
    /iPad/i.test(userAgent) ||
    (maxTouchPoints > 1 &&
      (platform === "MacIntel" || /Macintosh/i.test(userAgent)))
  ) {
    return "ipad";
  }
  if (/Android/i.test(userAgent)) return "android";
  if (/Mobile|Tablet|Mobi/i.test(userAgent)) return "other-mobile";
  return "desktop";
}

export function homeScreenBrowserGate(
  userAgent: string,
  kind: HomeScreenKind
): HomeScreenGate {
  if (IN_APP_BROWSER.test(userAgent)) return "use-browser";
  if (
    (kind === "iphone" || kind === "ipad") &&
    IOS_NON_SAFARI.test(userAgent)
  ) {
    return "use-safari";
  }
  return "ok";
}

export function shouldOfferAddToHomeScreen(
  env: HomeScreenEnvironment
): boolean {
  if (env.standalone) return false;
  return detectHomeScreenKind(env.userAgent, env.platform, env.maxTouchPoints) !==
    "desktop";
}

export function readHomeScreenEnvironment(): HomeScreenEnvironment {
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return {
    userAgent: nav.userAgent,
    platform: nav.platform,
    maxTouchPoints: nav.maxTouchPoints || 0,
    standalone: isStandaloneDisplay(
      nav.standalone === true,
      window.matchMedia("(display-mode: standalone)").matches,
      window.matchMedia("(display-mode: fullscreen)").matches,
      window.matchMedia("(display-mode: minimal-ui)").matches
    ),
  };
}

const SHORTCUT_NOTE =
  "This is a Home Screen shortcut to the website, not a separate App Store or Play listing.";

export function homeScreenTutorial(
  kind: HomeScreenKind,
  gate: HomeScreenGate
): HomeScreenTutorial {
  if (gate === "use-browser") {
    const safariOrChrome =
      kind === "android"
        ? "On Android, open this page in Chrome."
        : "On iPhone or iPad, open this page in Safari.";
    return {
      title: "Open Causey in your browser first",
      lead: "This in-app preview cannot add a Home Screen shortcut.",
      steps: [
        {
          title: "Open in a browser",
          body: `${safariOrChrome} Use Open in Browser if you see it, or copy the address from the share menu.`,
        },
        {
          title: "Add to Home Screen",
          body:
            kind === "android"
              ? "In Chrome, tap the three-dot menu, then Add to Home screen or Install app."
              : "In Safari, tap Share, then Add to Home Screen.",
        },
        {
          title: "Confirm",
          body: "Tap Add or Install. The red C opens this same site.",
        },
      ],
      note: SHORTCUT_NOTE,
    };
  }

  if (gate === "use-safari") {
    const device = kind === "ipad" ? "iPad" : "iPhone";
    return {
      title: "Add Causey from Safari",
      lead: `${device} only adds websites from Safari — not Chrome or Firefox.`,
      steps: [
        {
          title: "Open in Safari",
          body: "Tap Share or the browser menu, then Open in Safari. Or copy the address into Safari.",
        },
        {
          title: "Share",
          body:
            kind === "ipad"
              ? "In Safari, tap Share in the top bar, next to the address."
              : "In Safari, tap Share at the bottom — the square with the arrow pointing up.",
        },
        {
          title: "Add to Home Screen",
          body: "Scroll the list if you need to, tap Add to Home Screen, then Add.",
        },
      ],
      note: SHORTCUT_NOTE,
    };
  }

  if (kind === "iphone") {
    return {
      title: "Add Causey to Home Screen",
      lead: "Safari cannot do this in one tap. Three steps put the red C next to your other apps.",
      steps: [
        {
          title: "Share",
          body: "Tap Share at the bottom of Safari — the square with the arrow pointing up.",
        },
        {
          title: "Add to Home Screen",
          body: "Scroll the list if you need to, then tap Add to Home Screen.",
        },
        {
          title: "Add",
          body: "Tap Add. Causey opens from that icon without the Safari address bar.",
        },
      ],
      note: SHORTCUT_NOTE,
    };
  }

  if (kind === "ipad") {
    return {
      title: "Add Causey to Home Screen",
      lead: "Safari cannot do this in one tap. Three steps put the red C on your Home Screen.",
      steps: [
        {
          title: "Share",
          body: "Tap Share in Safari’s top bar, next to the address — the square with the arrow pointing up.",
        },
        {
          title: "Add to Home Screen",
          body: "Scroll the list if you need to, then tap Add to Home Screen.",
        },
        {
          title: "Add",
          body: "Tap Add. Causey opens from that icon without the Safari address bar.",
        },
      ],
      note: SHORTCUT_NOTE,
    };
  }

  if (kind === "android") {
    return {
      title: "Add Causey to Home Screen",
      lead: "If your browser did not show an install prompt, add the shortcut from the menu.",
      steps: [
        {
          title: "Browser menu",
          body: "Tap the three dots, usually at the top right of Chrome.",
        },
        {
          title: "Add to Home screen",
          body: "Tap Add to Home screen or Install app.",
        },
        {
          title: "Confirm",
          body: "Tap Add or Install. Causey opens from the icon without the browser chrome.",
        },
      ],
      note: SHORTCUT_NOTE,
    };
  }

  return {
    title: "Add Causey to Home Screen",
    lead: "Use your browser’s menu to put a shortcut next to your other apps.",
    steps: [
      {
        title: "Open the browser menu",
        body: "Look for three dots or a share icon in the toolbar.",
      },
      {
        title: "Add to Home screen",
        body: "Choose Add to Home screen or Install app.",
      },
      {
        title: "Confirm",
        body: "Tap Add or Install. The red C opens this same site.",
      },
    ],
    note: SHORTCUT_NOTE,
  };
}

export function homeScreenPromptCopy(kind: HomeScreenKind): {
  heading: string;
  body: string;
  action: string;
} {
  const heading = "Add Causey to Home Screen";
  const action = "Add to Home Screen";
  if (kind === "iphone" || kind === "ipad") {
    return {
      heading,
      body: "Safari needs three taps. We’ll show you Share, then Add to Home Screen.",
      action,
    };
  }
  if (kind === "android") {
    return {
      heading,
      body: "Your browser can add the icon now, or we’ll show the Chrome menu steps.",
      action,
    };
  }
  return {
    heading,
    body: "Put a Causey shortcut next to your other apps. We’ll show the taps for this browser.",
    action,
  };
}

export function requestAddToHomeScreen() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(ADD_TO_HOME_SCREEN_EVENT));
}

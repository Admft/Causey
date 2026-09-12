import ConfirmHcaptcha, {
  type HCaptchaMessageEvent,
} from "@hcaptcha/react-native-hcaptcha";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";

export const MOBILE_CAPTCHA_ERROR =
  "Could not complete the security check. Try again.";

export type MobileCaptchaHandle = {
  verify: () => Promise<string | null>;
};

type PendingVerification = {
  resolve: (token: string) => void;
  reject: (error: Error) => void;
};

const SITE_KEY = process.env.EXPO_PUBLIC_HCAPTCHA_SITE_KEY?.trim() ?? "";

export const MobileCaptcha = forwardRef<MobileCaptchaHandle>(
  function MobileCaptcha(_props, ref) {
    const captchaRef = useRef<ConfirmHcaptcha | null>(null);
    const pendingRef = useRef<PendingVerification | null>(null);

    useImperativeHandle(
      ref,
      () => ({
        verify: () => {
          if (!SITE_KEY) return Promise.resolve(null);
          if (pendingRef.current) {
            return Promise.reject(new Error(MOBILE_CAPTCHA_ERROR));
          }
          return new Promise<string>((resolve, reject) => {
            pendingRef.current = { resolve, reject };
            if (!captchaRef.current) {
              pendingRef.current = null;
              reject(new Error(MOBILE_CAPTCHA_ERROR));
              return;
            }
            captchaRef.current.show();
          });
        },
      }),
      []
    );

    useEffect(
      () => () => {
        pendingRef.current?.reject(new Error(MOBILE_CAPTCHA_ERROR));
        pendingRef.current = null;
      },
      []
    );

    if (!SITE_KEY) return null;

    function finishWithError() {
      const pending = pendingRef.current;
      pendingRef.current = null;
      captchaRef.current?.hide();
      pending?.reject(new Error(MOBILE_CAPTCHA_ERROR));
    }

    function onMessage(event: HCaptchaMessageEvent) {
      const value = event.nativeEvent.data;
      if (value === "open" || value === "loading timeout") return;

      if (event.success && value.length > 35) {
        const pending = pendingRef.current;
        pendingRef.current = null;
        event.markUsed?.();
        captchaRef.current?.hide();
        pending?.resolve(value);
        return;
      }

      finishWithError();
    }

    return (
      <ConfirmHcaptcha
        ref={captchaRef}
        siteKey={SITE_KEY}
        baseUrl="https://hcaptcha.com"
        size="invisible"
        showLoading
        closableLoading
        onMessage={onMessage}
      />
    );
  }
);

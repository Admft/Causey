declare module "@hcaptcha/react-native-hcaptcha" {
  import type { Component } from "react";

  export type HCaptchaMessageEvent = {
    nativeEvent: {
      data: string;
      description?: string;
    };
    success?: boolean;
    markUsed?: () => void;
    reset?: () => void;
  };

  export type ConfirmHcaptchaProps = {
    siteKey: string;
    baseUrl?: string;
    size?: "invisible" | "normal" | "compact";
    onMessage: (event: HCaptchaMessageEvent) => void;
    showLoading?: boolean;
    closableLoading?: boolean;
    languageCode?: string;
  };

  export default class ConfirmHcaptcha extends Component<ConfirmHcaptchaProps> {
    show(): void;
    hide(source?: string): void;
  }
}

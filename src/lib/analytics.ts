export type AnalyticsConfig = {
  measurementId?: string;
  productionHost?: string;
};

type Gtag = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
  }
}

export const GTAG_LOADER = "https://www.googletagmanager.com/gtag/js";

export type Schedule = (run: () => void) => void;

export const afterLoadWhenIdle: Schedule = (run) => {
  const idle = () => {
    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(() => run(), { timeout: 3000 });
    } else {
      setTimeout(run, 1);
    }
  };
  if (document.readyState === "complete") idle();
  else window.addEventListener("load", idle, { once: true });
};

export function initAnalytics(
  config: AnalyticsConfig | undefined,
  host: string = window.location.hostname,
  schedule: Schedule = afterLoadWhenIdle,
): boolean {
  const id = config?.measurementId?.trim();
  if (!id || !config?.productionHost || host !== config.productionHost) return false;
  if (window.gtag) return true;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", id);

  schedule(() => {
    const script = document.createElement("script");
    script.async = true;
    script.src = `${GTAG_LOADER}?id=${encodeURIComponent(id)}`;
    document.head.appendChild(script);
  });
  return true;
}

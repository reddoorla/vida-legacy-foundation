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

export function initAnalytics(
  config: AnalyticsConfig | undefined,
  host: string = window.location.hostname,
): boolean {
  const id = config?.measurementId?.trim();
  if (!id || !config?.productionHost || host !== config.productionHost) return false;

  const src = `${GTAG_LOADER}?id=${encodeURIComponent(id)}`;
  if (document.querySelector(`script[src="${src}"]`)) return true;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };

  const script = document.createElement("script");
  script.async = true;
  script.src = src;
  document.head.appendChild(script);

  window.gtag("js", new Date());
  window.gtag("config", id);
  return true;
}

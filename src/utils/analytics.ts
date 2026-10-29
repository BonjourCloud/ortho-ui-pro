/**
 * Fire a GA4 custom event safely.
 * Checks window.gtag exists (loaded async in index.html — G-XM4W5D4RRL).
 */
export function trackClick(
  eventName: string,
  params: Record<string, unknown> = {}
): void {
  if (
    typeof window !== "undefined" &&
    typeof (window as any).gtag === "function"
  ) {
    (window as any).gtag("event", eventName, {
      event_category: "contact",
      ...params,
    });
  }
}

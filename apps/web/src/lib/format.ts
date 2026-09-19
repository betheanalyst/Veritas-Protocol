/**
 * BigInt-safe GEN formatting and display utilities (Rule 8: wei-scale amounts
 * never go through unsafe Number conversions).
 */
export const GEN_DECIMALS = 18;
const WEI_PER_GEN = 10n ** BigInt(GEN_DECIMALS);

/** Format a wei-scale bigint as a GEN amount — integer part never passes through Number. */
export function formatGEN(wei: bigint, options?: { readonly maxFractionDigits?: number }): string {
  const maxFrac = options?.maxFractionDigits ?? 4;
  const negative = wei < 0n;
  const abs = negative ? -wei : wei;
  const integerPart = abs / WEI_PER_GEN;
  const fractionPart = abs % WEI_PER_GEN;
  const grouped = integerPart.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  if (fractionPart === 0n) return `${negative ? "-" : ""}${grouped} GEN`;
  const frac = fractionPart.toString().padStart(GEN_DECIMALS, "0").slice(0, maxFrac).replace(/0+$/, "");
  if (!frac) return `${negative ? "-" : ""}${grouped} GEN`;
  return `${negative ? "-" : ""}${grouped}.${frac} GEN`;
}

/** Shorten a hex string/address for primary display (full value stays available via copy). */
export function shortenHex(value: string, head = 6, tail = 4): string {
  if (value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}\u2026${value.slice(-tail)}`;
}

/** Derived relative time (labeled derived in the UI). */
export function formatRelativeTime(
  unixSeconds: number,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): string {
  const deltaSeconds = unixSeconds - nowSeconds;
  const absDelta = Math.abs(deltaSeconds);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (absDelta < 60) return rtf.format(Math.round(deltaSeconds), "second");
  if (absDelta < 3_600) return rtf.format(Math.round(deltaSeconds / 60), "minute");
  if (absDelta < 86_400) return rtf.format(Math.round(deltaSeconds / 3_600), "hour");
  if (absDelta < 2_592_000) return rtf.format(Math.round(deltaSeconds / 86_400), "day");
  return rtf.format(Math.round(deltaSeconds / 2_592_000), "month");
}

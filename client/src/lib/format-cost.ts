/** USD run cost: "—" when unknown, otherwise ≥3 decimals and ≥2 significant digits. */
export function formatCost(usd: number | null | undefined): string {
  if (usd == null) return "—";
  if (usd === 0) return "$0";
  return `$${usd.toFixed(Math.max(3, 1 - Math.floor(Math.log10(usd))))}`;
}

/* Number and text formatting shared by every Recruit view. */

const nf = new Intl.NumberFormat("en-IE");

export const num = (n: number) => nf.format(Math.round(n));
export const eur = (n: number) => (n < 0 ? "-€" : "€") + nf.format(Math.round(Math.abs(n)));
/** €85k style, one decimal only when it matters. */
export const eurK = (n: number) => {
  const k = n / 1000;
  return "€" + (Math.abs(k) >= 100 || Number.isInteger(k) ? Math.round(k) : k.toFixed(1)) + "k";
};
export const eurM = (n: number) => "€" + (n / 1000000).toFixed(n >= 10000000 ? 1 : 2).replace(/\.?0+$/, "") + "m";
export const range = (r: [number, number] | number[], short = false) =>
  short ? eurK(r[0]) + "-" + eurK(r[1]).replace("€", "") : eur(r[0]) + " - " + eur(r[1]);
export const pct = (n: number, digits = 0) => (n * 100).toFixed(digits) + "%";
export const pctRaw = (n: number, digits = 0) => n.toFixed(digits) + "%";
export const plural = (n: number, one: string, many?: string) => num(n) + " " + (n === 1 ? one : many || one + "s");
export const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase();
export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

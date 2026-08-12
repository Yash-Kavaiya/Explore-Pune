/**
 * Concrete hex values for the 5 category accents, mirroring the oklch chart
 * tokens in globals.css. Used where CSS variables can't reach — e.g. Google
 * Maps marker pins.
 */
export const ACCENT_HEX: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: "#c75b39", // saffron / terracotta
  2: "#3f8f6b", // deep green
  3: "#3e7ca8", // teal blue
  4: "#c79a3a", // gold
  5: "#a23b4b", // maroon
};

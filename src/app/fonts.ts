import { Bebas_Neue, Caveat, Geist } from "next/font/google";

/**
 * Type system:
 * - Geist: body / UI text (already part of the scaffold).
 * - Bebas Neue: display headlines (condensed, poster energy).
 * - Caveat: brush accents, reinterpretation of the hand-written
 *   lettering used in the original menu PDF.
 */
export const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  display: "swap",
});

export const bebas = Bebas_Neue({
  weight: "400",
  variable: "--font-bebas",
  subsets: ["latin"],
  display: "swap",
});

export const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  display: "swap",
});

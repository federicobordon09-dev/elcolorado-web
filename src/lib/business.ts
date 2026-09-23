/**
 * Business contact data, transcribed from verified sources only:
 * - Menu PDF (2 pages): phone, address variants, visual identity.
 * - Project brief: Instagram handle, address discrepancy note.
 *
 * Nothing in this file may be expanded with unverified information.
 * The public UI must only render `address.publicLabel` until the exact
 * street/locality is confirmed with the business.
 */

export interface BusinessAddress {
  /** The exact street address is NOT yet confirmed with the business. */
  status: "pending_verification";
  /** Neutral label approved for public UI while verification is pending. */
  publicLabel: string;
  /** Street variants found across sources (brief vs. menu PDF). Internal only. */
  streetVariants: readonly string[];
  /** Locality variants found across sources (brief vs. menu PDF). Internal only. */
  localityVariants: readonly string[];
  province: string;
}

export const business = {
  name: "El Colorado",
  /** "Resto Bar" comes from the business name itself. */
  descriptor: "Resto Bar",
  instagram: {
    handle: "@elcolorado.2024",
    url: "https://www.instagram.com/elcolorado.2024/",
  },
  phone: {
    /** Digits exactly as printed in the menu PDF. Do not modify. */
    display: "2622 373836",
    /** Standard +54 / area-code normalization of the same digits (dial link). */
    href: "tel:+542622373836",
    /**
     * PENDING: it is NOT yet confirmed that this number is a WhatsApp line.
     * Public CTA must stay call-only ("Llamar") until confirmed.
     */
    whatsappConfirmed: false,
  },
  address: {
    status: "pending_verification",
    publicLabel: "La Consulta · San Carlos · Mendoza",
    streetVariants: ["San Martín 234", "San Martin Norte 234"],
    localityVariants: ["San Carlos", "La Consulta"],
    province: "Mendoza",
  } satisfies BusinessAddress,
} as const;

/**
 * PENDING VERIFICATION — address discrepancy (internal documentation):
 * - Project brief says: "San Martín 234, San Carlos, Mendoza".
 * - Menu PDF says: "San Martin Norte 234, La Consulta, Mendoza".
 *
 * Both variants are ONE pending record, never two locations, and must never be
 * resolved by assumption. The public UI renders only `address.publicLabel`;
 * when the business confirms the street, swap it in and update the README.
 */
export const addressPendingVerification = true as const;

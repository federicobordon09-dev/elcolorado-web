import { z } from "zod";

export const MAX_LINE_QUANTITY = 20;
export const MIN_LINE_QUANTITY = 1;
export const MAX_NOTE_LENGTH = 280;
export const MAX_CUSTOMER_NAME = 80;
export const MAX_CUSTOMER_PHONE = 30;
export const MAX_PRESENTATION_LEN = 60;
export const MAX_SELECTED_OPTION_LEN = 60;
export const MAX_DELIVERY_ADDRESS_LEN = 200;
export const MIN_DELIVERY_ADDRESS_LEN = 5;
export const MAX_DELIVERY_REFERENCE_LEN = 200;

const nonEmptyTrimmed = z.string().trim().min(1);

/** Input line from client cart — treated as UNTRUSTED. Note is accepted but ignored server-side (cart notes are local only). */
export const checkoutLineSchema = z
  .object({
    productId: nonEmptyTrimmed.max(40),
    presentation: z.string().trim().max(MAX_PRESENTATION_LEN).nullable().optional(),
    selectedOption: z.string().trim().max(MAX_SELECTED_OPTION_LEN).nullable().optional(),
    note: z.string().max(MAX_NOTE_LENGTH).optional(),
    quantity: z.number().int().finite().min(MIN_LINE_QUANTITY).max(MAX_LINE_QUANTITY),
  })
  .strict();

export type CheckoutLineInput = z.infer<typeof checkoutLineSchema>;

export const checkoutInputSchema = z
  .object({
    lines: z.array(checkoutLineSchema).min(1),
    customerName: nonEmptyTrimmed.max(MAX_CUSTOMER_NAME),
    customerPhone: z
      .string()
      .trim()
      .max(MAX_CUSTOMER_PHONE)
      .transform((v) => (v === "" ? null : v))
      .nullable()
      .optional(),
    mode: z.enum(["dine_in", "takeaway"]),
    tableLabel: z.string().trim().max(40).nullable().optional(),
    deliveryAddress: z
      .string()
      .trim()
      .max(200)
      .nullable()
      .optional(),
    deliveryReference: z
      .string()
      .trim()
      .max(200)
      .nullable()
      .optional(),
  })
  .strict()
  .superRefine((val, ctx) => {
    if (val.mode === "dine_in") {
      // dine_in: only customerName required. No phone, no tableLabel, no delivery fields.
      if (val.customerPhone != null && val.customerPhone.trim().length > 0) {
        ctx.addIssue({
          code: "custom",
          path: ["customerPhone"],
          message: "El teléfono no es necesario para consumir en el local",
        });
      }
      if (val.tableLabel && val.tableLabel.trim().length > 0) {
        ctx.addIssue({
          code: "custom",
          path: ["tableLabel"],
          message: "La mesa no debe indicarse para consumir en el local",
        });
      }
      if (val.deliveryAddress != null && val.deliveryAddress.trim().length > 0) {
        ctx.addIssue({
          code: "custom",
          path: ["deliveryAddress"],
          message: "La dirección de entrega no debe indicarse para consumir en el local",
        });
      }
      if (val.deliveryReference != null && val.deliveryReference.trim().length > 0) {
        ctx.addIssue({
          code: "custom",
          path: ["deliveryReference"],
          message: "La referencia de entrega no debe indicarse para consumir en el local",
        });
      }
    } else if (val.mode === "takeaway") {
      // takeaway (Delivery): requires customerName, customerPhone, deliveryAddress. deliveryReference optional.
      if (val.tableLabel && val.tableLabel.trim().length > 0) {
        ctx.addIssue({
          code: "custom",
          path: ["tableLabel"],
          message: "La mesa no debe indicarse para delivery",
        });
      }
      // takeaway requires customerPhone
      if (!val.customerPhone || val.customerPhone.trim().length === 0) {
        ctx.addIssue({
          code: "custom",
          path: ["customerPhone"],
          message: "El teléfono es obligatorio para pedidos con delivery",
        });
      }
      // takeaway requires deliveryAddress
      if (!val.deliveryAddress || val.deliveryAddress.trim().length === 0) {
        ctx.addIssue({
          code: "custom",
          path: ["deliveryAddress"],
          message: "La dirección de entrega es obligatoria para pedidos con delivery",
        });
      } else {
        const addr = val.deliveryAddress.trim();
        if (addr.length < 5) {
          ctx.addIssue({
            code: "custom",
            path: ["deliveryAddress"],
            message: "La dirección de entrega debe tener al menos 5 caracteres",
          });
        }
        if (addr.length > 200) {
          ctx.addIssue({
            code: "custom",
            path: ["deliveryAddress"],
            message: "La dirección de entrega no puede exceder 200 caracteres",
          });
        }
      }
      // deliveryReference is optional but max 200 chars if provided
      if (val.deliveryReference != null && val.deliveryReference.trim().length > 0) {
        if (val.deliveryReference.trim().length > 200) {
          ctx.addIssue({
            code: "custom",
            path: ["deliveryReference"],
            message: "La referencia no puede exceder 200 caracteres",
          });
        }
      }
    }
  });

export type CheckoutInput = z.infer<typeof checkoutInputSchema>;

/** Domain validation errors (codes stable for UI mapping). */
export const CheckoutErrorCode = {
  INVALID_INPUT: "INVALID_INPUT",
  PRODUCT_NOT_FOUND: "PRODUCT_NOT_FOUND",
  PRODUCT_UNAVAILABLE: "PRODUCT_UNAVAILABLE",
  PRESENTATION_INVALID: "PRESENTATION_INVALID",
  OPTION_INVALID: "OPTION_INVALID",
  NOTE_TOO_LONG: "NOTE_TOO_LONG",
  QUANTITY_INVALID: "QUANTITY_INVALID",
  DUPLICATE_LINES_MERGE_FAILED: "DUPLICATE_LINES_MERGE_FAILED",
  MODE_TABLE_INCONSISTENT: "MODE_TABLE_INCONSISTENT",
  TOTAL_OVERFLOW: "TOTAL_OVERFLOW",
  PRICE_NULL_POLICY: "PRICE_NULL_POLICY",
  EMPTY_LINES: "EMPTY_LINES",
  INTERNAL: "INTERNAL",
} as const;

export type CheckoutErrorCode = (typeof CheckoutErrorCode)[keyof typeof CheckoutErrorCode];

export class CheckoutValidationError extends Error {
  code: CheckoutErrorCode;
  constructor(code: CheckoutErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "CheckoutValidationError";
  }
}
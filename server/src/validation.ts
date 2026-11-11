import { z } from "zod";

const text = (max: number) => z.string().trim().min(1).max(max);
const optionalText = (max: number) => z.string().trim().max(max).default("");

export const dressInput = z.object({
  name: text(160),
  price: z.coerce.number().finite().nonnegative().max(10_000_000),
  category: optionalText(80).default("New Dress"),
  sizes: optionalText(200),
  description: optionalText(5000),
  washCare: optionalText(2000),
  shipping: optionalText(2000),
});

export const orderStatus = z.enum(["New order", "In progress", "Dispatched", "Received", "Return requested", "Returned"]);

export const customerInput = z.object({
  firstName: text(80), lastName: text(80), address: text(300), apartment: optionalText(120),
  city: text(100), state: text(100), pinCode: z.string().trim().regex(/^\d{4,10}$/), phone: z.string().trim().regex(/^[+\d][\d\s-]{6,19}$/),
});

export const orderInput = z.object({
  customer: customerInput,
  items: z.array(z.object({ id: z.string().uuid(), size: text(40), quantity: z.coerce.number().int().min(1).max(20) })).min(1).max(50),
});

export const contactInput = z.object({ name: text(100), email: z.string().trim().email().max(254), subject: text(180), message: text(5000) });
export const reviewInput = z.object({ name: text(100), stars: z.coerce.number().int().min(1).max(5), description: text(3000) });

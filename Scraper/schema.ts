import { z } from "zod";

export const BookSchema = z.object({
    product_url: z.string().url().startsWith("https://"),
    title: z.string().min(1),
    price_gbp: z.number().nonnegative(),
    price_text: z.string().min(1),
    availability_text: z.string().min(1),
    rating_text: z.enum(["Zero", "One", "Two", "Three", "Four", "Five"]),
    description: z.string().nullable(),
    source_page: z.string().url(),
    fetched_at: z.string().datetime(),
});

export type Book = z.infer<typeof BookSchema>;
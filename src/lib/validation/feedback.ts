import { z } from "zod";

export const feedbackSchema = z.strictObject({
  liked: z
    .union([z.literal(1), z.literal(2), z.literal(3)], {
      error: "Cette note n'est pas valable.",
    })
    .nullable(),
  leftovers: z.boolean({ error: "Indique s'il y a des restes." }),
  comment: z.string().max(500, "Le commentaire est trop long.").optional(),
});

export type FeedbackDemande = z.infer<typeof feedbackSchema>;

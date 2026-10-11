import { z } from "zod";
export const credentials = z.object({
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,20}$/, "Username: 3-20 characters, letters, numbers, underscore."),
  password: z.string().min(8, "Password must be at least 8 characters.").max(72),
});

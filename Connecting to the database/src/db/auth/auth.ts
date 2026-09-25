// src/db/auth/auth.ts
import { createAuthClient } from "@neondatabase/auth";

export const auth = createAuthClient(process.env.NEON_AUTH_BASE_URL!);
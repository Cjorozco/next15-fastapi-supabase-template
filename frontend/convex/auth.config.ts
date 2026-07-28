import { AuthConfig } from "convex/server";

const supabaseUrl = process.env.SUPABASE_URL!;

export default {
  providers: [
    {
      type: "customJwt",
      issuer: `${supabaseUrl}/auth/v1`,
      jwks: `${supabaseUrl}/auth/v1/.well-known/jwks.json`,
      applicationID: "authenticated",
      algorithm: "ES256",
    },
  ],
} satisfies AuthConfig;

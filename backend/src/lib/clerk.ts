import { createClerkClient, type ClerkClient } from "@clerk/backend";

let client: ClerkClient | null = null;

export function getClerkClient(): ClerkClient {
  if (!client) {
    const secretKey = process.env.CLERK_SECRET_KEY;
    if (!secretKey) {
      throw new Error("CLERK_SECRET_KEY is not configured");
    }
    client = createClerkClient({ secretKey });
  }
  return client;
}

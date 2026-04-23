import type { SessionStore } from "./session-store.ts";
import { InMemorySessionStore } from "./session-store.memory.ts";
import { SupabaseSessionStore } from "./session-store.supabase.ts";
import { getEnvVar } from "../runtime/env.ts";

export function createSessionStore(): SessionStore {
  const driver = getEnvVar("SESSION_STORE_DRIVER") ?? "memory";

  if (driver === "memory") {
    return new InMemorySessionStore();
  }

  if (driver === "supabase") {
    const supabaseUrl = getEnvVar("SUPA_URL");
    const secretKey = getEnvVar("SUPA_SECRET_KEY");

    if (!supabaseUrl || !secretKey) {
      throw new Error(
        "SUPA_URL and SUPA_SECRET_KEY are required when SESSION_STORE_DRIVER=supabase",
      );
    }

    return new SupabaseSessionStore(supabaseUrl, secretKey);
  }

  throw new Error(`Unsupported SESSION_STORE_DRIVER: ${driver}`);
}

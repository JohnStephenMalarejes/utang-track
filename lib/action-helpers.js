import { createClient } from "./supabase/server.js";

/** Turn a Supabase/Postgres error into a message a person can act on. */
export function friendlyError(error) {
  const code = error?.code;
  const message = error?.message || "Something went wrong";
  if (code === "23503") return "This record is still in use by other records, so it can't be removed.";
  if (code === "23505") return "A record with the same name already exists.";
  if (code === "42501") return "You don't have permission to do that. Make sure your account is registered as the administrator.";
  if (code === "23514") return "One of the values is outside the allowed range.";
  return message;
}

export const fail = (error, extra = {}) => ({ ok: false, error: typeof error === "string" ? error : friendlyError(error), ...extra });
export const succeed = (extra = {}) => ({ ok: true, ...extra });

/** Runs a server action body with an authenticated Supabase client, or returns a clean error. */
export async function withAuth(fn) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return fail("Your session has expired. Please sign in again.");
    return await fn(supabase);
  } catch (error) {
    return fail(error);
  }
}

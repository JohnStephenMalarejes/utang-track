"use client";

import { useTransition } from "react";
import { toast } from "sonner";

/**
 * Runs a server action inside a transition and reports the result with a toast.
 *   run(() => deleteMember(id), { success: "Member deleted", onSuccess: () => ... })
 */
export function useServerAction() {
  const [pending, startTransition] = useTransition();

  const run = (action, { success, onSuccess, onError, silentError = false } = {}) =>
    new Promise((resolve) => {
      startTransition(async () => {
        let result;
        try {
          result = await action();
        } catch (error) {
          result = { ok: false, error: error?.message || "Something went wrong. Please try again." };
        }
        if (result.ok) {
          if (success) toast.success(success);
          onSuccess?.(result);
        } else {
          if (!silentError) toast.error(result.error);
          onError?.(result);
        }
        resolve(result);
      });
    });

  return { pending, run };
}

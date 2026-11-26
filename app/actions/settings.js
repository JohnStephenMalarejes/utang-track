"use server";

import { revalidatePath } from "next/cache";
import { paymentDetailsSchema, firstError } from "@/lib/validations/schemas";
import { fail, succeed, withAuth } from "@/lib/action-helpers";

export async function savePaymentDetails(input) {
  const parsed = paymentDetailsSchema.safeParse(input);
  if (!parsed.success) return fail(firstError(parsed));
  const { payment_details } = parsed.data;

  return withAuth(async (supabase) => {
    const { error } = await supabase
      .from("app_settings")
      .upsert({ id: 1, payment_details: payment_details || null }, { onConflict: "id" });

    if (error) {
      if (error.code === "42P01" || error.code === "PGRST205") {
        return fail("Run supabase/migrations/0004_features.sql in your Supabase SQL Editor first to enable saved payment details.");
      }
      return fail(error);
    }

    revalidatePath("/", "layout");
    return succeed();
  });
}

import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { RECEIPT_PATH_PATTERN } from "@/lib/constants";

const BUCKET = "receipts";
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
  ["image/heic", "heic"],
  ["image/heif", "heif"],
]);

async function requireAdminSupabase() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  return { supabase };
}

export async function GET(request) {
  const { supabase, error: authErr } = await requireAdminSupabase();
  if (authErr) return authErr;

  const path = request.nextUrl.searchParams.get("path") || "";
  if (!RECEIPT_PATH_PATTERN.test(path)) {
    return NextResponse.json({ error: "Invalid receipt path" }, { status: 400 });
  }

  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  if (error || !data) {
    return NextResponse.json({ error: error?.message || "Receipt not found" }, { status: 404 });
  }

  const buffer = await data.arrayBuffer();
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": data.type || "image/jpeg",
      "Cache-Control": "private, max-age=300",
    },
  });
}

export async function POST(request) {
  const { supabase, error: authErr } = await requireAdminSupabase();
  if (authErr) return authErr;

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload payload" }, { status: 400 });
  }

  const file = formData.get("file");
  const folder = formData.get("folder") === "payments" ? "payments" : "expenses";

  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "Select an image file to upload" }, { status: 400 });
  }
  const ext = ALLOWED_MIME.get(file.type);
  if (!ext) {
    return NextResponse.json({ error: "Only JPG, PNG, WebP, GIF, or HEIC images are supported" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image must be 5 MB or smaller" }, { status: 400 });
  }

  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, {
    contentType: file.type,
    upsert: false,
  });

  if (error) {
    const msg = error.message?.toLowerCase().includes("bucket")
      ? "Storage bucket 'receipts' is missing. Run supabase/migrations/0004_features.sql in Supabase first."
      : error.message || "Could not upload image";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ path }, { status: 200 });
}

export async function DELETE(request) {
  const { supabase, error: authErr } = await requireAdminSupabase();
  if (authErr) return authErr;

  const path = request.nextUrl.searchParams.get("path") || "";
  if (!RECEIPT_PATH_PATTERN.test(path)) {
    return NextResponse.json({ error: "Invalid receipt path" }, { status: 400 });
  }

  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) {
    return NextResponse.json({ error: error.message || "Could not remove receipt" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

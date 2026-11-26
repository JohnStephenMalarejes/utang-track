"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function receiptUrl(path) {
  return path ? `/api/receipts?path=${encodeURIComponent(path)}` : "";
}

/**
 * Uploads an image to Supabase Storage via `/api/receipts` and exposes its storage `path`.
 */
export function ReceiptUpload({ folder = "expenses", value, onChange, label = "Upload photo" }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError("");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", folder);
      const res = await fetch("/api/receipts", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setUploadError(data?.error || "Could not upload image");
      } else {
        onChange?.(data.path);
      }
    } catch {
      setUploadError("Upload failed. Check your connection and try again.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="sr-only"
        aria-label={label}
      />

      {value ? (
        <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50/70 p-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={receiptUrl(value)}
            alt="Attached receipt preview"
            className="h-14 w-14 shrink-0 rounded-md border border-slate-200 bg-white object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-slate-800">Photo attached</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-xs" disabled={uploading} onClick={() => inputRef.current?.click()}>
                {uploading ? <Loader2 className="animate-spin" /> : <ImagePlus />}
                Replace
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                disabled={uploading}
                onClick={() => onChange?.(null)}
              >
                <Trash2 /> Remove
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50/60 px-3 py-3 text-xs font-medium text-slate-600 transition-colors hover:border-slate-400 hover:bg-slate-100/70 hover:text-slate-900 disabled:opacity-50"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          {uploading ? "Uploading photo…" : `${label} (JPG, PNG, WebP · max 5 MB)`}
        </button>
      )}

      {uploadError && (
        <p className="text-xs text-destructive" role="alert">
          {uploadError}
        </p>
      )}
    </div>
  );
}

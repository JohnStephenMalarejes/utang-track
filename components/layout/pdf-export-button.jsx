"use client";

import { useEffect, useState } from "react";
import { FileDown, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

function triggerPdfDownload(bytes, filename) {
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/**
 * Renders an "Export PDF" button and, when the browser/device supports native file sharing,
 * a "Share PDF" button so the user can directly send the PDF via Messenger, WhatsApp, Email, etc.
 */
export function PdfExportButton({ getPdfBytes, filename = "utang-tracker.pdf", shareTitle = "Utang Tracker Statement", label = "Export PDF", size = "default", variant = "outline" }) {
  const [canShareFiles, setCanShareFiles] = useState(false);

  useEffect(() => {
    try {
      if (typeof navigator !== "undefined" && typeof navigator.canShare === "function" && typeof File !== "undefined") {
        const testFile = new File(["%PDF-1.4"], "test.pdf", { type: "application/pdf" });
        setCanShareFiles(navigator.canShare({ files: [testFile] }));
      }
    } catch {
      setCanShareFiles(false);
    }
  }, []);

  function handleDownload() {
    try {
      const bytes = getPdfBytes();
      triggerPdfDownload(bytes, filename);
      toast.success("PDF exported");
    } catch (err) {
      toast.error(err?.message || "Could not generate PDF");
    }
  }

  async function handleShare() {
    try {
      const bytes = getPdfBytes();
      const safeName = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
      const file = new File([bytes], safeName, { type: "application/pdf" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: shareTitle,
          text: shareTitle,
          files: [file],
        });
      } else {
        triggerPdfDownload(bytes, safeName);
        toast.success("PDF downloaded and ready to share");
      }
    } catch (err) {
      if (err?.name === "AbortError") return;
      toast.error(err?.message || "Could not share PDF");
    }
  }

  return (
    <div className="inline-flex flex-wrap items-center gap-2">
      <Button type="button" variant={variant} size={size} onClick={handleDownload}>
        <FileDown /> {label}
      </Button>
      {canShareFiles && (
        <Button type="button" variant="outline" size={size} onClick={handleShare}>
          <Share2 /> Share PDF
        </Button>
      )}
    </div>
  );
}

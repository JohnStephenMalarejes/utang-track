"use client";

import { useEffect, useState } from "react";
import { Check, Copy, ExternalLink, Link2, Loader2, RefreshCw, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { generateMemberShareToken, revokeMemberShareToken } from "@/app/actions/members";
import { useServerAction } from "@/hooks/use-server-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function ShareLinkDialog({ open, onOpenChange, member }) {
  const [origin, setOrigin] = useState("");
  const [token, setToken] = useState(member?.shareToken ?? null);
  const [copied, setCopied] = useState(false);
  const { pending, run } = useServerAction();

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (open) {
      setToken(member?.shareToken ?? null);
      setCopied(false);
    }
  }, [open, member?.shareToken]);

  const shareUrl = token ? `${origin}/s/${token}` : "";

  async function copyUrl() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Statement link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy link");
    }
  }

  function handleGenerate(isRotate = false) {
    run(() => generateMemberShareToken(member.id), {
      success: isRotate ? "New link generated (old link disabled)" : "Shareable statement link created",
      onSuccess: (res) => {
        if (res?.token) setToken(res.token);
      },
    });
  }

  function handleRevoke() {
    run(() => revokeMemberShareToken(member.id), {
      success: "Share link revoked",
      onSuccess: () => setToken(null),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share statement for {member?.name}</DialogTitle>
          <DialogDescription>
            Anyone with this private read-only link can see {member?.name}’s own unpaid bills, balance, and payment history without signing in.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          {token ? (
            <>
              <div className="flex gap-2">
                <Input readOnly value={shareUrl} aria-label="Shareable statement URL" className="bg-slate-50 font-mono text-xs" />
                <Button type="button" onClick={copyUrl} className="shrink-0">
                  {copied ? <Check /> : <Copy />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button asChild type="button" variant="outline" size="sm">
                  <a href={shareUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink /> Open preview
                  </a>
                </Button>
                <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => handleGenerate(true)}>
                  {pending ? <Loader2 className="animate-spin" /> : <RefreshCw />}
                  Regenerate
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:bg-red-50 hover:text-red-700"
                  disabled={pending}
                  onClick={handleRevoke}
                >
                  <ShieldOff /> Disable link
                </Button>
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-5 text-center">
              <div className="mx-auto mb-2.5 flex h-10 w-10 items-center justify-center rounded-full bg-white text-ink shadow-hairline">
                <Link2 className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium text-ink">No active link yet</p>
              <p className="mt-1 text-xs text-slate-500">
                Create a private link so {member?.name} can check their live balance anytime. You can revoke it at any time.
              </p>
              <Button type="button" size="sm" className="mt-4" disabled={pending} onClick={() => handleGenerate(false)}>
                {pending ? <Loader2 className="animate-spin" /> : <Link2 />}
                Create share link
              </Button>
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

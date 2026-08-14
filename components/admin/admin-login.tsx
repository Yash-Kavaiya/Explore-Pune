"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AdminLogin() {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const passphrase = String(new FormData(e.currentTarget).get("passphrase") ?? "");
    try {
      const res = await fetch("/api/admin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passphrase }),
      });
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(json?.error || "Could not sign in");
      toast.success("Signed in");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not sign in");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
      <div className="space-y-2">
        <Label htmlFor="passphrase">Passphrase</Label>
        <Input id="passphrase" name="passphrase" type="password" required autoComplete="current-password" />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Checking…" : "Open dashboard"}
      </Button>
    </form>
  );
}

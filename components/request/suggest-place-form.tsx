"use client";

import * as React from "react";
import { toast } from "sonner";
import { CATEGORIES } from "@/lib/data/categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { CategoryId } from "@/lib/types";

export function SuggestPlaceForm() {
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const form = e.currentTarget;
    const data = new FormData(form);

    try {
      const files = (data.getAll("photos") as File[]).filter((f) => f instanceof File && f.size > 0);
      let photoUrls: string[] = [];
      if (files.length > 0) {
        const upload = new FormData();
        for (const file of files.slice(0, 6)) upload.append("files", file);
        const up = await fetch("/api/uploads", { method: "POST", body: upload });
        const upJson = (await up.json().catch(() => null)) as { urls?: string[]; error?: string } | null;
        if (!up.ok) throw new Error(upJson?.error || "Could not upload photos");
        photoUrls = upJson?.urls ?? [];
      }

      const latRaw = String(data.get("lat") ?? "").trim();
      const lngRaw = String(data.get("lng") ?? "").trim();
      const body = {
        name: String(data.get("name") ?? ""),
        area: String(data.get("area") ?? ""),
        category: String(data.get("category") ?? "") as CategoryId,
        whySpecial: String(data.get("whySpecial") ?? ""),
        submittedBy: String(data.get("submittedBy") ?? "").trim() || undefined,
        photoUrls,
        ...(latRaw ? { lat: Number(latRaw) } : {}),
        ...(lngRaw ? { lng: Number(lngRaw) } : {}),
      };

      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json().catch(() => null)) as
        | { error?: string; issues?: { fieldErrors?: Record<string, string[]> } }
        | null;
      if (!res.ok) {
        const fieldMsg = json?.issues?.fieldErrors
          ? Object.values(json.issues.fieldErrors).flat()[0]
          : undefined;
        throw new Error(fieldMsg || json?.error || "Could not send your suggestion");
      }

      toast.success("Received — we'll read it before it goes live.");
      setDone(true);
      formRef.current?.reset();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(msg);
      toast.error(msg);
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
        <h2 className="font-heading text-xl font-semibold">Thank you</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Your note is in the queue. If we publish it, it will show up in the directory with
          your words as the first description.
        </p>
        <Button className="mt-5" type="button" onClick={() => setDone(false)}>
          Suggest another
        </Button>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className="space-y-5 rounded-2xl border border-border/70 bg-card p-5 shadow-sm sm:p-6"
    >
      <div className="space-y-2">
        <Label htmlFor="name">Place name</Label>
        <Input id="name" name="name" required minLength={3} maxLength={120} placeholder="e.g. Vishrambaug Wada" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="area">Area</Label>
          <Input id="area" name="area" required minLength={2} maxLength={80} placeholder="e.g. Budhwar Peth" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <NativeSelect id="category" name="category" required defaultValue="forts-palaces">
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="whySpecial">Why is it worth visiting?</Label>
        <Textarea
          id="whySpecial"
          name="whySpecial"
          required
          minLength={20}
          maxLength={1500}
          rows={6}
          placeholder="A few honest sentences — what you felt, when to go, what to skip."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="submittedBy">Your name (optional)</Label>
        <Input id="submittedBy" name="submittedBy" maxLength={60} placeholder="Shown as the submitter" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="lat">Latitude (optional)</Label>
          <Input id="lat" name="lat" type="number" step="any" min={-90} max={90} placeholder="18.52" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lng">Longitude (optional)</Label>
          <Input id="lng" name="lng" type="number" step="any" min={-180} max={180} placeholder="73.85" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="photos">Photos (optional, up to 6)</Label>
        <Input id="photos" name="photos" type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple />
        <p className="text-xs text-muted-foreground">JPG, PNG, WEBP or GIF. Each file under 4 MB.</p>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button type="submit" disabled={pending} className="h-10 px-5">
        {pending ? "Sending…" : "Send suggestion"}
      </Button>
    </form>
  );
}

import type { Metadata } from "next";
import { isAdmin } from "@/lib/admin-auth";
import { getStats } from "@/lib/store/stats.repo";
import { listRequests } from "@/lib/store/requests.repo";
import { AdminLogin } from "@/components/admin/admin-login";
import { AdminPanel } from "@/components/admin/admin-panel";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const ok = await isAdmin();
  if (!ok) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
        <h1 className="font-heading text-3xl font-bold tracking-tight">Admin</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter the site passphrase to moderate suggestions and reviews.
        </p>
        <div className="mt-6">
          <AdminLogin />
        </div>
      </div>
    );
  }

  const [stats, requests] = await Promise.all([getStats(), listRequests()]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
      <AdminPanel stats={stats} requests={requests} />
    </div>
  );
}

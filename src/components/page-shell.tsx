import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { getCurrentUser } from "@/lib/auth-helpers";
import { env } from "@/lib/env";

export async function PageShell({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return (
    <>
      <SiteNav user={user} isDemo={env.isDemo} />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </>
  );
}

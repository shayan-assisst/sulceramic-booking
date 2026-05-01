import { env } from "@/lib/env";
import { redirect } from "next/navigation";

export async function getCurrentUser() {
  if (env.isDemo) {
    return {
      id: "demo-user",
      name: "Demo User",
      email: "demo@sulceramic.com",
      image: null,
      role: "USER" as const,
    };
  }
  const { auth } = await import("@/auth");
  const session = await auth();
  if (!session?.user) return null;
  return session.user as {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role: "USER" | "OWNER";
  };
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");
  return user!;
}

export async function requireOwner() {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");
  // In demo mode, anyone can preview owner pages.
  if (!env.isDemo && user.role !== "OWNER") redirect("/dashboard");
  return user!;
}

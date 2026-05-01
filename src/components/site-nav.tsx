"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type User = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: "USER" | "OWNER";
} | null;

export function SiteNav({ user, isDemo }: { user: User; isDemo?: boolean }) {
  const pathname = usePathname();
  const isOwner = user?.role === "OWNER";

  const isOwnerArea = pathname.startsWith("/owner");
  const links = user
    ? isDemo
      ? isOwnerArea
        ? [
            { href: "/owner", label: "Overview" },
            { href: "/owner/availability", label: "Availability" },
            { href: "/owner/bookings", label: "Bookings" },
            { href: "/owner/messages", label: "Messages" },
            { href: "/dashboard", label: "↺ User view" },
          ]
        : [
            { href: "/dashboard", label: "Overview" },
            { href: "/dashboard/bookings", label: "Bookings" },
            { href: "/dashboard/messages", label: "Messages" },
            { href: "/book", label: "Book" },
            { href: "/owner", label: "↺ Owner view" },
          ]
      : isOwner
      ? [
          { href: "/owner", label: "Overview" },
          { href: "/owner/availability", label: "Availability" },
          { href: "/owner/bookings", label: "Bookings" },
          { href: "/owner/messages", label: "Messages" },
        ]
      : [
          { href: "/dashboard", label: "Overview" },
          { href: "/dashboard/bookings", label: "Bookings" },
          { href: "/dashboard/messages", label: "Messages" },
          { href: "/book", label: "Book" },
        ]
    : [
        { href: "/", label: "Studio" },
        { href: "/book", label: "Book" },
      ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-terracotta-200/60 bg-cream-50/85 backdrop-blur">
      <div className="container flex h-16 items-center justify-between">
        <Link href={user ? (isOwner ? "/owner" : "/dashboard") : "/"} className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-terracotta-500 text-white font-serif text-lg">
            S
          </span>
          <span className="font-serif text-lg tracking-wide text-clay-dark">
            Sul <span className="text-terracotta-600">Ceramic</span>
          </span>
          {isDemo && (
            <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-800">
              Demo
            </span>
          )}
        </Link>
        <nav className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm transition-colors",
                pathname === l.href || pathname.startsWith(l.href + "/")
                  ? "bg-terracotta-100 text-clay-dark"
                  : "text-clay-mid hover:bg-cream-200 hover:text-clay-dark"
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-2">
              {user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.image} alt="" className="h-8 w-8 rounded-full" />
              ) : (
                <div className="grid h-8 w-8 place-items-center rounded-full bg-terracotta-200 text-clay-dark text-sm">
                  {(user.name || user.email || "U")[0]}
                </div>
              )}
              <Link
                href="/api/auth/signout"
                className="text-xs text-clay-mid hover:text-clay-dark"
              >
                Sign out
              </Link>
            </div>
          ) : (
            <Link
              href="/signin"
              className="rounded-md bg-terracotta-500 px-3 py-2 text-sm text-white hover:bg-terracotta-600"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
      <nav className="md:hidden border-t border-terracotta-100">
        <div className="container flex gap-1 overflow-x-auto py-2 no-scrollbar">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "shrink-0 rounded-md px-3 py-1.5 text-sm transition-colors",
                pathname === l.href || pathname.startsWith(l.href + "/")
                  ? "bg-terracotta-100 text-clay-dark"
                  : "text-clay-mid"
              )}
            >
              {l.label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}

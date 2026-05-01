import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/page-shell";
import { env } from "@/lib/env";

export default function SignInPage() {
  return (
    <PageShell>
      <div className="container max-w-md py-16">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Welcome back</CardTitle>
            <CardDescription>
              Sign in with Google to manage your bookings. We use Calendar to send invites for your
              sessions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {env.isDemo ? (
              <div className="rounded-md bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900">
                <strong>Demo mode.</strong> Authentication is disabled — head straight to the{" "}
                <Link href="/dashboard" className="underline">
                  dashboard
                </Link>
                .
              </div>
            ) : (
              <form action="/api/auth/signin/google" method="POST">
                <Button type="submit" size="lg" className="w-full">
                  <GoogleIcon /> Continue with Google
                </Button>
              </form>
            )}
            <p className="text-xs text-clay-mid">
              By continuing you agree to receive booking-related emails from Sul Ceramic.
            </p>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path
        fill="#fff"
        d="M17.6 9.2c0-.6-.05-1.2-.15-1.7H9v3.4h4.85c-.21 1.13-.84 2.09-1.79 2.74v2.27h2.9c1.7-1.57 2.64-3.88 2.64-6.7z"
      />
      <path
        fill="#fff"
        d="M9 18c2.43 0 4.46-.8 5.95-2.18l-2.9-2.27c-.8.54-1.83.86-3.05.86-2.34 0-4.32-1.58-5.03-3.7H.97v2.33C2.45 15.98 5.49 18 9 18z"
      />
      <path
        fill="#fff"
        d="M3.97 10.7c-.18-.54-.28-1.12-.28-1.7s.1-1.16.28-1.7V4.97H.97A8.99 8.99 0 0 0 0 9c0 1.45.35 2.83.97 4.03l3-2.33z"
      />
      <path
        fill="#fff"
        d="M9 3.58c1.32 0 2.5.45 3.43 1.34l2.57-2.57C13.46.89 11.43 0 9 0 5.49 0 2.45 2.02.97 4.97l3 2.33C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  );
}

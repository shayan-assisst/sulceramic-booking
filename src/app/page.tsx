import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { env } from "@/lib/env";
import { formatPrice } from "@/lib/utils";

export default function Home() {
  return (
    <PageShell>
      <section className="container pt-12 pb-16 md:pt-24 md:pb-28">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-terracotta-600">
              Sul Ceramic · Studio
            </p>
            <h1 className="mt-3 font-serif text-4xl md:text-6xl text-clay-dark text-balance leading-tight">
              Quiet hands, soft clay, slow afternoons.
            </h1>
            <p className="mt-6 text-lg text-clay-mid max-w-xl">
              A small ceramics studio in the south of Portugal. Come for a single afternoon, or
              join a monthly residency and work alongside Miguel as your hands learn the wheel.
            </p>
            <div className="mt-8 flex gap-3 flex-wrap">
              <Button asChild size="lg">
                <Link href="/book">Book a session</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="#sessions">Learn more</Link>
              </Button>
            </div>
          </div>
          <div className="relative aspect-square rounded-2xl bg-gradient-to-br from-terracotta-200 to-terracotta-400 shadow-xl overflow-hidden">
            <div className="absolute inset-0 grid place-items-center">
              <div className="relative h-3/4 w-3/4">
                <div className="absolute inset-0 rounded-full bg-cream-100/40 blur-2xl" />
                <svg viewBox="0 0 200 200" className="relative h-full w-full">
                  <defs>
                    <radialGradient id="bowl" cx="50%" cy="40%" r="60%">
                      <stop offset="0%" stopColor="#F5F0E8" />
                      <stop offset="55%" stopColor="#C17A4A" />
                      <stop offset="100%" stopColor="#56341F" />
                    </radialGradient>
                  </defs>
                  <ellipse cx="100" cy="120" rx="78" ry="58" fill="url(#bowl)" />
                  <ellipse cx="100" cy="92" rx="78" ry="14" fill="#3D2B1F" opacity="0.85" />
                  <ellipse cx="100" cy="92" rx="68" ry="9" fill="#1A0F08" />
                </svg>
              </div>
            </div>
            <div className="absolute bottom-4 right-4 rounded-md bg-cream-50/90 px-3 py-1.5 text-xs text-clay-mid">
              hand-thrown · stoneware
            </div>
          </div>
        </div>
      </section>

      <section id="sessions" className="container pb-20">
        <h2 className="font-serif text-3xl text-clay-dark mb-2">Two ways in</h2>
        <p className="text-clay-mid mb-8 max-w-2xl">
          Whether you're sitting at the wheel for the very first time, or you want a regular weekly
          rhythm — pick the format that suits you.
        </p>
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>First Session</CardTitle>
              <CardDescription>
                A 2-hour one-on-one introduction to the wheel. No experience needed.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="text-sm text-clay-mid space-y-1.5">
                <li>· Two hours, single session</li>
                <li>· Aprons and tools provided</li>
                <li>· Take home one piece, fired & glazed</li>
              </ul>
              <div className="flex items-center justify-between pt-4 border-t border-terracotta-100">
                <span className="font-serif text-2xl text-clay-dark">
                  {formatPrice(env.priceFirstSession)}
                </span>
                <Button asChild>
                  <Link href="/book?type=first">Book first session</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Residency</CardTitle>
              <CardDescription>
                Four sessions a month at the same weekly time. Three-month minimum commitment.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="text-sm text-clay-mid space-y-1.5">
                <li>· 4 × 2-hour sessions, billed monthly</li>
                <li>· Same weekly day & time, your spot</li>
                <li>· Reschedule individual sessions up to 24h before</li>
              </ul>
              <div className="flex items-center justify-between pt-4 border-t border-terracotta-100">
                <span className="font-serif text-2xl text-clay-dark">
                  {formatPrice(env.priceResidencyMonth)}
                  <span className="text-sm text-clay-mid font-sans"> / month</span>
                </span>
                <Button asChild>
                  <Link href="/book?type=residency">Join residency</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="container pb-24">
        <div className="rounded-2xl bg-clay-dark text-cream-100 p-10 md:p-14">
          <p className="font-serif text-2xl md:text-3xl max-w-3xl text-balance leading-snug">
            "Pottery doesn't reward speed. The clay tells you when it's ready. Most of what I teach
            is patience — the rest follows."
          </p>
          <p className="mt-4 text-cream-200/70 text-sm">— Miguel, studio owner</p>
        </div>
      </section>
    </PageShell>
  );
}

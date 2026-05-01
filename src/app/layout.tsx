import type { Metadata } from "next";
import "./globals.css";
import { ToasterProvider } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "Sul Ceramic — Booking",
  description:
    "Book a first session or join a residency at Sul Ceramic — a hand-built ceramics studio in the south of Portugal.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="paper min-h-screen flex flex-col">
        <ToasterProvider>{children}</ToasterProvider>
      </body>
    </html>
  );
}

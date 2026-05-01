import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";

const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          scope: `openid email profile ${CALENDAR_SCOPE}`,
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) return false;
      // Owner detection
      const role = user.email === env.ownerEmail ? "OWNER" : "USER";
      try {
        await prisma.user.upsert({
          where: { email: user.email },
          create: {
            email: user.email,
            name: user.name,
            image: user.image,
            role,
            googleAccessToken: account?.access_token ?? null,
            googleRefreshToken: account?.refresh_token ?? null,
          },
          update: {
            role,
            googleAccessToken: account?.access_token ?? undefined,
            googleRefreshToken: account?.refresh_token ?? undefined,
          },
        });
      } catch (e) {
        console.error("signIn upsert failed", e);
      }
      return true;
    },
    async session({ session, user }) {
      if (session.user && user) {
        (session.user as any).id = user.id;
        const u = await prisma.user.findUnique({ where: { id: user.id } });
        (session.user as any).role = u?.role ?? "USER";
      }
      return session;
    },
  },
  pages: {
    signIn: "/signin",
  },
});

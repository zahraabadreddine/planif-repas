import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import type { Role } from "@prisma/client";
import { verifierIdentifiants } from "./identifiants";

declare module "next-auth" {
  interface User {
    role?: Role;
  }
  interface Session {
    user: { id: string; role: Role; name?: string | null; email?: string | null };
  }
}

// next-auth/jwt ne fait que réexporter @auth/core/jwt : c'est ce module qu'on augmente.
declare module "@auth/core/jwt" {
  interface JWT {
    id?: string;
    role?: Role;
  }
}

/** Durée de vie d'une session : 30 jours. */
const DUREESESSION = 30 * 24 * 60 * 60;

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTHSECRET,
  // L'hébergeur de démonstration place l'application derrière un proxy : on fait confiance à l'en-tête Host.
  trustHost: true,
  session: { strategy: "jwt", maxAge: DUREESESSION },
  pages: { signIn: "/connexion" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: verifierIdentifiants,
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (token.id && token.role) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },
});

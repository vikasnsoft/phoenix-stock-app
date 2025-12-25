import NextAuth, { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

interface AuthApiUser {
  readonly id: string;
  readonly email: string;
  readonly name: string | null;
  readonly role: "FREE" | "PRO" | "ADMIN";
}

interface AuthApiResponse {
  readonly accessToken: string;
  readonly user: AuthApiUser;
}

interface CredentialsAuthUser {
  readonly id: string;
  readonly email: string;
  readonly name: string | null;
  readonly role: "FREE" | "PRO" | "ADMIN";
  readonly accessToken: string;
}

const isCredentialsAuthUser = (value: unknown): value is CredentialsAuthUser => {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  return (
    "id" in value &&
    "email" in value &&
    "role" in value &&
    "accessToken" in value
  );
};

const apiBaseUrl: string = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email: string = credentials?.email ?? "";
        const password: string = credentials?.password ?? "";
        if (!email || !password) {
          return null;
        }
        const response = await fetch(`${apiBaseUrl}/api/auth/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password }),
        });
        if (!response.ok) {
          return null;
        }
        const data: AuthApiResponse = (await response.json()) as AuthApiResponse;
        const result: CredentialsAuthUser = {
          id: data.user.id,
          email: data.user.email,
          name: data.user.name,
          role: data.user.role,
          accessToken: data.accessToken,
        };
        return result;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (isCredentialsAuthUser(user)) {
        token.accessToken = user.accessToken;
        token.role = user.role;
        token.userId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string;
      const currentUser = session.user ?? { name: null, email: null, image: null };
      session.user = {
        ...currentUser,
        id: token.userId as string,
        role: token.role as "FREE" | "PRO" | "ADMIN",
      };
      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

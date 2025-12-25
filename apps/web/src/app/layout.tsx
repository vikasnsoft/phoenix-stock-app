import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { QueryProviders } from "@/providers/query-client-provider";
import { AuthSessionProvider } from "@/providers/auth-session-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Phoenix - Advanced Stock Screener",
  description: "Professional grade stock screener and technical analysis tool",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <QueryProviders>
          <AuthSessionProvider>
            <div className="relative flex min-h-screen flex-col">
              <Navbar />
              <main className="flex-1">{children}</main>
            </div>
          </AuthSessionProvider>
        </QueryProviders>
      </body>
    </html>
  );
}

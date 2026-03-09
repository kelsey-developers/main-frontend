import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import Chatbot from "@/components/Chatbot";
import { AuthProvider } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import ConditionalFooter from "@/components/ConditionalFooter";
import type { UserInfo } from "@/lib/api/auth";

export const metadata: Metadata = {
  title: "Kelsey's Homestay - Never feel the homesickness again",
  description: "Find your perfect home away from home while you're on your dream vacation",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const userCookie = cookieStore.get("user")?.value;
  const initialUser: UserInfo | null = userCookie
    ? (JSON.parse(userCookie) as UserInfo)
    : null;

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen flex flex-col font-sans" suppressHydrationWarning>
        <AuthProvider initialUser={initialUser}>
          <Navbar />
          <main className="flex-1">{children}</main>
          <ConditionalFooter />
          <Chatbot />
        </AuthProvider>
      </body>
    </html>
  );
}

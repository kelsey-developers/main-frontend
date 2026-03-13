import type { Metadata } from "next";
import "./globals.css";
import Chatbot from "@/components/Chatbot";
import { AuthProvider } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import ConditionalFooter from "@/components/ConditionalFooter";
import { getUserFromServer } from "@/lib/actions/auth";

export const metadata: Metadata = {
  title: "Kelsey's Homestay - Never feel the homesickness again",
  description: "Find your perfect home away from home while you're on your dream vacation",
  icons: {
    icon: '/logo-only.png',
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialUser = await getUserFromServer();

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

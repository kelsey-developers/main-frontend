import type { Metadata } from "next";
import dynamic from "next/dynamic";
import "./globals.css";
import Chatbot from "@/components/Chatbot";
import { MockAuthProvider } from "@/contexts/MockAuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Kelsey's Homestay - Never feel the homesickness again",
  description: "Find your perfect home away from home while you're on your dream vacation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen flex flex-col font-sans" suppressHydrationWarning>
        <MockAuthProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
          <Chatbot />
        </MockAuthProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";
import { MockAuthProvider } from "@/contexts/MockAuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Chatbot from "@/components/Chatbot";

export const metadata: Metadata = {
  title: "Kelsey's Homestay - Feel at home anytime, anywhere!",
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

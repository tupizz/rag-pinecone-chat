import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { QueryProvider } from "@/providers/QueryProvider";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Eloquent AI Chatbot - Your Intelligent Fintech Assistant",
  description:
    "AI-powered chatbot for fintech customer support with RAG technology",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className="">
      <body className={inter.className}>
        <QueryProvider>
          <ThemeProvider>
            <AuthProvider>{children}</AuthProvider>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { AuthProvider } from "@/contexts/auth-context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LinkLab",
  description: "Find creative collaborators and share project ideas.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
    <body className="flex h-dvh flex-col overflow-hidden">
        <AuthProvider>
            <Navbar />

            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
                {children}
            </div>
        </AuthProvider>
    </body>
    </html>
  );
}

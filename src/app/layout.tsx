import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { AuthProvider } from "@/contexts/auth-context";

const geistSans = localFont({
  src: [
    {
      path: "./fonts/Geist-VariableFont_wght.ttf",
      weight: "100 900",
      style: "normal",
    },
    {
      path: "./fonts/Geist-Italic-VariableFont_wght.ttf",
      weight: "100 900",
      style: "italic",
    },
  ],
  variable: "--font-geist-sans",
  display: "swap",
});

const geistMono = localFont({
  src: [
    {
      path: "./fonts/GeistMono-VariableFont_wght.ttf",
      weight: "100 900",
      style: "normal",
    },
    {
      path: "./fonts/GeistMono-Italic-VariableFont_wght.ttf",
      weight: "100 900",
      style: "italic",
    },
  ],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "LinkLab",
  description: "Find creative collaborators and share project ideas.",
};

export default function RootLayout({ children, gallery }: {
  children: React.ReactNode;
  gallery?: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
    <body className="flex h-dvh flex-col overflow-hidden">
        <AuthProvider>
            <Navbar />

            <div className="app-scroll-area flex min-h-0 flex-1 flex-col overflow-y-auto bg-slate-50">
                {children}
            </div>
            {gallery}
        </AuthProvider>
    </body>
    </html>
  );
}

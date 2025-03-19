import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from 'react-hot-toast';

const inter = Inter({
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: "AI Tool Dashboard",
  description: "A comprehensive AI-powered dashboard with PDF analysis, news, weather, stocks, sentiment analysis, and more.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased bg-gray-50 min-h-screen`}>
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  );
}

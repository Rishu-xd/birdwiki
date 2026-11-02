import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SITE_URL } from "../lib/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),

  title: {
    default: "BirdWiki | Explore the World of Birds",
    template: "%s | BirdWiki",
  },

  description:
    "Explore an illustrated bird species catalog with common and scientific names, taxonomy, and trusted species references.",

  alternates: {
    canonical: "/",
  },

  openGraph: {
    title: "BirdWiki | Explore the World of Birds",
    description:
      "Explore an illustrated bird species catalog with common and scientific names, taxonomy, and trusted species references.",
    url: SITE_URL,
    siteName: "BirdWiki",
    type: "website",
    images: ["/bg.png"],
  },

  twitter: {
    card: "summary_large_image",
    title: "BirdWiki | Explore the World of Birds",
    description:
      "Explore an illustrated bird species catalog with common and scientific names, taxonomy, and trusted species references.",
    images: ["/bg.png"],
  },

  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

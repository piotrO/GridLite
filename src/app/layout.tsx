import type { Metadata } from "next";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "GridLite - Your Personal AI Ad Agency",
  description:
    "Create stunning animated ads without the agency. Enter your website URL, let AI analyze your brand, and generate professional HTML5 ads in minutes.",
  keywords:
    "AI ad agency, ad generator, HTML5 ads, animated ads, small business marketing",
  openGraph: {
    title: "GridLite - Your Personal AI Ad Agency",
    description:
      "Create stunning animated ads without the agency markup. AI-powered strategy and creative generation.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    site: "@GridLite",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";
import { Fraunces, Instrument_Sans, IBM_Plex_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { ThemeInitScript } from "@/components/theme/ThemeInitScript";

const fontBody = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const fontDisplay = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const fontMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Marketing Agent - AI-Powered Outreach",
  description: "Delegate your outreach to AI. Describe your goal in plain English and let our agent handle the rest.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${fontBody.variable} ${fontDisplay.variable} ${fontMono.variable} font-sans antialiased`}>
        <ThemeInitScript />
        <ThemeProvider>
          {children}
          <div className="fixed bottom-5 right-5 z-50">
            <ThemeToggle />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}

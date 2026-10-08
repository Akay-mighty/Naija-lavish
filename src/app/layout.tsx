import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: "NaijaLavish | Abuja Multiplayer Life Game",
  description:
    "NaijaLavish is a free online life game set in Abuja. Hustle, ride okada, link up with friends, spray money at the owambe and own your city. Ages 18+.",
  keywords: [
    "NaijaLavish", "Abuja game", "Nigeria life game", "online multiplayer game",
    "hustle game", "owambe", "Naija lifestyle", "browser game",
  ],
  authors: [{ name: "NaijaLavish" }],
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon-48.png",
    apple: "/icon-180.png",
  },
  openGraph: {
    title: "NaijaLavish | Abuja, Your Way",
    description:
      "Hustle, ride, link up and spray money at the owambe. A free Abuja life game in your browser. Ages 18+.",
    siteName: "NaijaLavish",
    type: "website",
    locale: "en_NG",
  },
  twitter: {
    card: "summary_large_image",
    title: "NaijaLavish | Abuja, Your Way",
    description: "Hustle, ride, link up and spray money at the owambe. Free Abuja life game.",
  },
};

export const viewport: Viewport = {
  themeColor: "#f5f5f7",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${poppins.variable} antialiased bg-background text-foreground`}
        style={{ fontFamily: "var(--font-poppins), ui-sans-serif, system-ui, sans-serif" }}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}

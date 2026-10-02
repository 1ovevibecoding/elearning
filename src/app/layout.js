import { ClerkProvider } from "@clerk/nextjs";
import { Inter, IBM_Plex_Mono, Fraunces } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  variable: "--font-inter",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["opsz", "wght"],
});

export const metadata = {
  title: "PREP IELTS — Elevate Your Band Score",
  description: "AI-powered IELTS preparation",
  icons: { icon: "/favicon.ico" },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1E1C1A",
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#DA7756",
          colorBackground: "#262422",
          colorText: "#EDE8E0",
          colorInputBackground: "#1E1C1A",
          colorInputText: "#EDE8E0",
          borderRadius: "10px",
        },
      }}
    >
      <html lang="vi" className={`${inter.variable} ${ibmPlexMono.variable} ${fraunces.variable}`}>
        <body style={{ margin: 0 }}>{children}</body>
      </html>
    </ClerkProvider>
  );
}

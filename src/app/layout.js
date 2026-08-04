import { ClerkProvider } from "@clerk/nextjs";
import { Inter, IBM_Plex_Mono } from "next/font/google";
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

export const metadata = {
  title: "Bàn Học IELTS — Ôn luyện cá nhân với AI",
  description:
    "Web app cá nhân để ôn luyện IELTS: từ vựng Feynman, shadowing, luyện Writing & Speaking có AI chấm điểm, spaced repetition, và theo dõi tiến độ band.",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#3E8577",
          colorBackground: "#1c212d",
          colorText: "#EDE7D9",
          colorInputBackground: "#14171f",
          colorInputText: "#EDE7D9",
          borderRadius: "10px",
        },
      }}
    >
      <html lang="vi" className={`${inter.variable} ${ibmPlexMono.variable}`}>
        <head>
          <link
            href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&display=swap"
            rel="stylesheet"
          />
        </head>
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}

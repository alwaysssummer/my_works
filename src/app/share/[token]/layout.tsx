import type { Metadata, Viewport } from "next";
import "../../globals.css";

export const metadata: Metadata = {
  title: "학생 목록 (공유)",
  description: "공유된 학생 목록 - 읽기 전용",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  colorScheme: "light dark",
};

export default function ShareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <meta name="robots" content="noindex, nofollow" />
      </head>
      <body className="antialiased bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}

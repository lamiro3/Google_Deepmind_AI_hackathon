import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Komposer | AI K-POP Composer & Dream Collab Platform",
  description:
    "좋아하는 K-POP 가수의 음악/뮤직비디오 스타일을 살려 새로운 생성 음악과 드림 콜라보 곡을 작곡하고 공유하는 플랫폼",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="dark">
      <body className="min-h-screen bg-zinc-950 text-zinc-50 antialiased selection:bg-pink-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}


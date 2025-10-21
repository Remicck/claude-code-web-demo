import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "割り勘管理アプリ",
  description: "LINEアカウントで簡単に割り勘を管理",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}

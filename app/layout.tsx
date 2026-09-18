import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "atoms-lite",
  description: "atoms-lite scaffold",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}

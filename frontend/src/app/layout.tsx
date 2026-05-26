import type { Metadata } from "next";
import "../styles/index.css";

export const metadata: Metadata = {
  title: "ResearchForge",
  description: "Socratic research design assistant",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import { Outfit, Noto_Sans_Georgian } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

const notoGeorgian = Noto_Sans_Georgian({
  variable: "--font-noto-georgian",
  subsets: ["georgian"],
  weight: ["400", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Taply",
  description: "ციფრული ლოიალობის ბარათი თქვენი ბიზნესისთვის",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ka"
      className={`${outfit.variable} ${notoGeorgian.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

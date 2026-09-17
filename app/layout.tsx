import type { Metadata } from "next";
import { Fredoka, Noto_Sans_Georgian } from "next/font/google";
import "./globals.css";

/* Fredoka carries no Georgian glyphs and tops out at 700 — Noto Sans
   Georgian below is the next stack entry, so Georgian resolves there. */
const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const notoGeorgian = Noto_Sans_Georgian({
  variable: "--font-noto-georgian",
  subsets: ["georgian"],
  weight: ["400", "600", "700", "800"],
});

const DESCRIPTION =
  "Taply — ციფრული ლოიალობის ბარათი თქვენი ბიზნესისთვის. სტემპ-ბარათი, რომელიც კლიენტის ტელეფონში ცხოვრობს.";

export const metadata: Metadata = {
  title: "Taply",
  description: DESCRIPTION,
  applicationName: "Taply",
  openGraph: {
    title: "Taply",
    description: DESCRIPTION,
    siteName: "Taply",
    type: "website",
    locale: "ka_GE",
  },
  twitter: {
    card: "summary",
    title: "Taply",
    description: DESCRIPTION,
  },
};

/* Applies the stored dashboard theme before first paint (no flash on hard
   loads). Lives in the root layout so React never re-renders it during
   client navigation. Only the dashboard's .dash wrapper reacts to the
   attribute, so public pages are unaffected. */
const dashThemeInit = `try{if(localStorage.getItem('taply-dash-theme')==='dark')document.documentElement.dataset.dashTheme='dark'}catch(e){}`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ka"
      className={`${fredoka.variable} ${notoGeorgian.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <script dangerouslySetInnerHTML={{ __html: dashThemeInit }} />
        {children}
      </body>
    </html>
  );
}

import { Fraunces, Work_Sans } from "next/font/google";
import "./globals.css";

const headline = Fraunces({
  subsets: ["latin"],
  variable: "--font-headline",
});

const body = Work_Sans({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata = {
  metadataBase: new URL("https://quish-family.vercel.app"),
  title: {
    default: "Quish Family Explorer",
    template: "%s | Quish Family Explorer",
  },
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
  description:
    "A shareable family-tree style view of Quish households in the Irish census, starting with 1901 and 1911 and ready for 1926.",
  openGraph: {
    title: "Quish Family Explorer",
    description:
      "A census-first, family-friendly explorer for Quish households across the Irish census.",
    images: ["/opengraph-image"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Quish Family Explorer",
    description:
      "A census-first, family-friendly explorer for Quish households across the Irish census.",
    images: ["/opengraph-image"],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${headline.variable} ${body.variable}`}>{children}</body>
    </html>
  );
}

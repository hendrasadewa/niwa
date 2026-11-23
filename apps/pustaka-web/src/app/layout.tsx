import type { Metadata, Viewport } from "next";
import { Open_Sans, Playfair_Display } from "next/font/google";
import { QueryProvider } from "@/providers/query-provider";
import { AuthProvider } from "@/providers/auth-provider";
import "./globals.css";

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const COLOR_SCHEME_INIT_SCRIPT = `try{var p=localStorage.getItem("niwa:color-scheme");if(p==="light"||p==="dark"){var m=document.querySelector('meta[name="color-scheme"]');if(m)m.content=p;document.documentElement.setAttribute("data-theme",p);document.documentElement.classList.add(p);}}catch(e){}`;

export const viewport: Viewport = {
  colorScheme: "light dark",
};

export const metadata: Metadata = {
  title: "Pustaka — Household Mini-Library",
  description:
    "Browse the household physical book collection, track reading progress, and share reviews.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${playfairDisplay.variable} ${openSans.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: COLOR_SCHEME_INIT_SCRIPT }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-background font-sans text-foreground selection:bg-primary-soft selection:text-primary-soft-foreground">
        <QueryProvider>
          <AuthProvider>{children}</AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}

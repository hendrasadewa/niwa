import type { Metadata, Viewport } from "next";
import { Open_Sans, Playfair_Display } from "next/font/google";
import { QueryProvider } from "@/providers/query-provider";
import { AuthProvider } from "@/providers/auth-provider";
import { CartProvider } from "@/providers/cart-provider";
import { Navbar } from "@/components/layout/navbar";
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
  title: "Open-PO — UMKM Pre-Order Management System",
  description:
    "Manage UMKM pre-order catalogs, price-locked campaign waves, manual transfer receipts, and visual order tracking.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-brand="preorder"
      suppressHydrationWarning
      className={`${playfairDisplay.variable} ${openSans.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: COLOR_SCHEME_INIT_SCRIPT }}
        />
      </head>
      <body className="min-h-full flex flex-col overflow-x-clip bg-background font-sans text-foreground selection:bg-primary-soft selection:text-primary-soft-foreground">
        <QueryProvider>
          <AuthProvider>
            <CartProvider>
              <Navbar />
              <main className="min-w-0 flex-1">{children}</main>
              <footer className="border-t border-border py-6 pb-24 text-center text-xs text-muted-foreground md:pb-6">
                <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 sm:flex-row">
                  <span>
                    Open-PO — Micro-Ecommerce Pre-Order Platform for UMKM
                  </span>
                  <span>Built inside the niwa monorepo</span>
                </div>
              </footer>
            </CartProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}

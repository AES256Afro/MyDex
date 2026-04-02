import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/providers";
import { PWARegister } from "@/components/pwa-register";
import "@/styles/globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://mydexnow.com"),
  title: {
    default: "MyDex - Digital Employee Experience Platform",
    template: "%s | MyDex",
  },
  description:
    "Real-time monitoring, proactive issue resolution, OS compliance, and DEX scoring — unified in one platform. Open-source employee experience management for modern teams.",
  keywords: [
    "digital employee experience",
    "DEX platform",
    "employee monitoring",
    "device management",
    "IT operations",
    "endpoint management",
    "productivity tracking",
    "SOC 2 compliance",
    "fleet health",
    "MDM integration",
  ],
  authors: [{ name: "MyDex" }],
  creator: "MyDex",
  publisher: "MyDex",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://mydexnow.com",
    siteName: "MyDex",
    title: "MyDex - Digital Employee Experience Platform",
    description:
      "Real-time monitoring, proactive issue resolution, OS compliance, and DEX scoring — unified in one open-source platform.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "MyDex - Digital Employee Experience Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MyDex - Digital Employee Experience Platform",
    description:
      "Real-time monitoring, proactive issue resolution, OS compliance, and DEX scoring — unified in one open-source platform.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "32x32" },
    ],
    apple: "/apple-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "MyDex",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#6d28d9" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="MyDex" />
        {/* Auto-reload on stale chunks or missing CSS after new deployments */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var key = 'chunk-reload';
                var reloaded = sessionStorage.getItem(key);
                function doReload() {
                  if (!reloaded) {
                    sessionStorage.setItem(key, '1');
                    window.location.reload();
                  }
                }
                function tryReload(msg) {
                  if (msg && (msg.indexOf('ChunkLoadError') !== -1 || msg.indexOf('Loading chunk') !== -1)) doReload();
                }
                window.addEventListener('error', function(e) { tryReload(e.message); });
                window.addEventListener('unhandledrejection', function(e) { tryReload(e.reason && e.reason.message); });
                // Detect missing CSS: if no stylesheets loaded after 3s, page is unstyled
                if (!reloaded) {
                  setTimeout(function() {
                    var styled = document.querySelectorAll('link[rel="stylesheet"]');
                    var loaded = 0;
                    styled.forEach(function(link) { if (link.sheet) loaded++; });
                    if (styled.length > 0 && loaded === 0) doReload();
                    // Fallback: check if body has default unstyled background
                    var bg = getComputedStyle(document.body).backgroundColor;
                    if (bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent') doReload();
                  }, 3000);
                }
                if (reloaded) sessionStorage.removeItem(key);
              })();
            `,
          }}
        />
      </head>
      <body className={`${inter.variable} antialiased`}>
        <Providers>{children}</Providers>
        <PWARegister />
      </body>
    </html>
  );
}

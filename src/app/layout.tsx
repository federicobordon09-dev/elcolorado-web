import type { Metadata, Viewport } from "next";
import "./globals.css";
import { bebas, caveat, geist } from "./fonts";

export const metadata: Metadata = {
  title: "El Colorado Resto Bar",
  description:
    "Carta de El Colorado Resto Bar: pizzas, sándwiches, vizcacheras, licuados, cafetería, bebidas, cervezas y tragos. Teléfono e Instagram de contacto en La Consulta, San Carlos, Mendoza.",
  openGraph: {
    title: "El Colorado Resto Bar",
    description:
      "La carta completa de El Colorado Resto Bar: pizzas, sándwiches, vizcacheras, licuados, cafetería, bebidas, cervezas y tragos.",
    locale: "es_AR",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0a0a",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es-AR"
      className={`${geist.variable} ${bebas.variable} ${caveat.variable} h-full antialiased`}
      /* The inline head script adds `js` to this className before hydration;
         that intentional client-only mutation must not warn. */
      suppressHydrationWarning
    >
      <head>
        {/* Enables progressive-enhancement styles (.js .reveal …) only when JS runs. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `document.documentElement.classList.add("js")`,
          }}
        />
        {/* Reload/navigate start at the top with a clean URL: take over scroll
            restoration and strip any leftover hash before paint. Back/forward
            keeps the browser's native restoration untouched. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=performance.getEntriesByType("navigation")[0]?.type;if(t!=="back_forward"){history.scrollRestoration="manual";if(location.hash){history.replaceState(null,"",location.pathname+location.search);}window.scrollTo({top:0,behavior:"instant"});}}catch(e){}`,
          }}
        />
      </head>
      <body className="flex min-h-full flex-col font-sans">
        <a href="#main" className="skip-link">
          Saltar al contenido
        </a>
        {children}
      </body>
    </html>
  );
}

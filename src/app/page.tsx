import { AnchorNav } from "@/components/AnchorNav";
import { BackToTop } from "@/components/BackToTop";
import { Carta } from "@/components/Carta";
import { Experiencia } from "@/components/Experiencia";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { Visitar } from "@/components/Visitar";
import { CatalogProvider } from "@/components/cart/CatalogProvider";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { buildCatalogIndex, toCatalogIndexDTO } from "@/lib/catalog-index";
import { getMenuCatalog } from "@/lib/catalog";

export default async function Home() {
  const catalog = await getMenuCatalog();
  const catalogDto = toCatalogIndexDTO(buildCatalogIndex(catalog));

  return (
    <CatalogProvider dto={catalogDto}>
      <Header />
      {/* tabIndex -1: skip-link target for programmatic keyboard focus. */}
      <main id="main" tabIndex={-1} className="flex-1">
        <Hero />
        <Experiencia />
        <Carta catalog={catalog} />
        <Visitar />
      </main>
      <Footer />
      {/* Out-of-flow / null renderers: no impact on the body flex layout. */}
      <AnchorNav />
      <BackToTop />
      <CartDrawer />
    </CatalogProvider>
  );
}

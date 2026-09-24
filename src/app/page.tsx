import { AnchorNav } from "@/components/AnchorNav";
import { BackToTop } from "@/components/BackToTop";
import { Carta } from "@/components/Carta";
import { Experiencia } from "@/components/Experiencia";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { Visitar } from "@/components/Visitar";

export default function Home() {
  return (
    <>
      <Header />
      {/* tabIndex -1: skip-link target for programmatic keyboard focus. */}
      <main id="main" tabIndex={-1} className="flex-1">
        <Hero />
        <Experiencia />
        <Carta />
        <Visitar />
      </main>
      <Footer />
      {/* Out-of-flow / null renderers: no impact on the body flex layout. */}
      <AnchorNav />
      <BackToTop />
    </>
  );
}

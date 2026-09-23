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
      <main id="main" className="flex-1">
        <Hero />
        <Experiencia />
        <Carta />
        <Visitar />
      </main>
      <Footer />
    </>
  );
}

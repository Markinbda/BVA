import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import bvaLogo from "@/assets/bva-logo.jpg";
import heroBeachTournament from "@/assets/Splash screen/Mens Beach.jpg";
import heroNationalBeach from "@/assets/Splash screen/BVA-Early.jpeg";
import heroJuniorWomen from "@/assets/Splash screen/placeholder-junior.jpg";
import heroMensNational from "@/assets/Splash screen/Boys Team.jpg";
import heroWomensNational from "@/assets/Splash screen/hero-womens-national.jpeg";
import heroGrassIndoor from "@/assets/Splash screen/placeholder-camp.jpg";

const slides = [
  {
    image: heroBeachTournament,
    title: "Beach, Grass & Indoor",
    subtitle: "Tournaments",
    description: "Compete across all formats of volleyball in Bermuda",
    link: "/leagues",
  },
  {
    image: heroNationalBeach,
    title: "National Beach",
    subtitle: "Program",
    description: "Representing Bermuda on the international beach circuit",
    link: "/programs/senior",
  },
  {
    image: heroJuniorWomen,
    title: "Junior Women's",
    subtitle: "Indoor",
    description: "Developing the next generation of female volleyball talent",
    link: "/programs/junior/girls",
  },
  {
    image: heroMensNational,
    title: "Men's National",
    subtitle: "Team",
    description: "Bermuda's elite men competing on the world stage",
    link: "/programs/senior/mens",
  },
  {
    image: heroWomensNational,
    title: "Women's National",
    subtitle: "Team",
    description: "Pride, passion and power — Bermuda's women's volleyball",
    link: "/programs/senior/womens",
  },
  {
    image: heroGrassIndoor,
    title: "Grass & Indoor",
    subtitle: "Leagues",
    description: "Year-round competitive and recreational league play",
    link: "/leagues",
  },
];

const HeroSlider = () => {
  const [current, setCurrent] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const goTo = useCallback(
    (index: number) => {
      if (isTransitioning) return;
      setIsTransitioning(true);
      setCurrent(index);
      setTimeout(() => setIsTransitioning(false), 700);
    },
    [isTransitioning]
  );

  const next = useCallback(() => goTo((current + 1) % slides.length), [current, goTo]);
  const prev = useCallback(() => goTo((current - 1 + slides.length) % slides.length), [current, goTo]);

  // Auto-advance
  useEffect(() => {
    const timer = setInterval(next, 6000);
    return () => clearInterval(timer);
  }, [next]);

  return (
    <section className="relative h-[70vh] min-h-[500px] max-h-[800px] overflow-hidden bg-primary">
      {/* Slides */}
      {slides.map((slide, i) => (
        <div
          key={i}
          className="absolute inset-0 transition-opacity duration-700 ease-in-out"
          style={{ opacity: i === current ? 1 : 0, zIndex: i === current ? 1 : 0 }}
        >
          <img
            src={slide.image}
            alt={slide.title}
            className="absolute inset-0 h-full w-full object-cover"
          />
          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/85 via-primary/50 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-primary/60 via-transparent to-primary/30" />
        </div>
      ))}

      {/* Content */}
      <div className="relative z-10 flex h-full items-center">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl">
            {/* Logo */}
            <img
              src={bvaLogo}
              alt="BVA Logo"
              className="mb-6 h-16 w-16 rounded-full object-contain opacity-0 animate-fade-in"
            />

            {/* Title */}
            <h1
              key={`title-${current}`}
              className="font-heading text-5xl font-bold uppercase leading-tight tracking-wide text-primary-foreground md:text-7xl opacity-0 animate-fade-in"
            >
              {slides[current].title}
              <span className="block text-accent">{slides[current].subtitle}</span>
            </h1>

            <p
              key={`desc-${current}`}
              className="mt-4 max-w-lg text-lg text-primary-foreground/70 opacity-0 animate-fade-in"
              style={{ animationDelay: "150ms" }}
            >
              {slides[current].description}
            </p>

            <div
              className="mt-8 flex flex-wrap gap-4 opacity-0 animate-fade-in"
              style={{ animationDelay: "300ms" }}
            >
              <Button
                asChild
                size="lg"
                className="border-2 border-accent bg-accent text-accent-foreground font-heading uppercase tracking-wide hover:bg-accent/90 shadow-lg shadow-accent/20"
              >
                <Link to={slides[current].link}>Explore</Link>
              </Button>
              <Button
                asChild
                size="lg"
                className="border-2 border-primary-foreground/50 bg-transparent text-primary-foreground font-heading uppercase tracking-wide hover:bg-primary-foreground/15 backdrop-blur-sm"
              >
                <Link to="/registration">Register Now</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation arrows */}
      <button
        onClick={prev}
        className="absolute left-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-primary/40 p-2 text-primary-foreground backdrop-blur-sm transition-all hover:bg-primary/70 hover:scale-110"
        aria-label="Previous slide"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>
      <button
        onClick={next}
        className="absolute right-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-primary/40 p-2 text-primary-foreground backdrop-blur-sm transition-all hover:bg-primary/70 hover:scale-110"
        aria-label="Next slide"
      >
        <ChevronRight className="h-6 w-6" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === current
                ? "w-8 bg-accent"
                : "w-2 bg-primary-foreground/40 hover:bg-primary-foreground/60"
            }`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </section>
  );
};

export default HeroSlider;

import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import bvaLogo from "@/assets/bva-logo.jpg";
import heroBeachTournament from "@/assets/Splash screen/Mens Beach.jpg";
import heroNationalBeach from "@/assets/Splash screen/BVA-Early.jpg";
import heroJuniorWomen from "@/assets/Splash screen/placeholder-junior.jpg";
import heroMensNational from "@/assets/Splash screen/Boys Team.jpg";
import heroWomensNational from "@/assets/Splash screen/hero-womens-national.jpeg";
import heroGrassIndoor from "@/assets/Splash screen/placeholder-camp.jpg";

interface SlideData {
  image: string;
  title: string;
  subtitle: string;
  description: string;
  link: string;
}

const FALLBACK_SLIDES: SlideData[] = [
  { image: heroBeachTournament, title: "Beach, Grass & Indoor", subtitle: "Tournaments", description: "Compete across all formats of volleyball in Bermuda", link: "/leagues" },
  { image: heroNationalBeach, title: "National Beach", subtitle: "Program", description: "Representing Bermuda on the international beach circuit", link: "/programs/senior" },
  { image: heroJuniorWomen, title: "Junior Women's", subtitle: "Indoor", description: "Developing the next generation of female volleyball talent", link: "/programs/junior/girls" },
  { image: heroMensNational, title: "Men's National", subtitle: "Team", description: "Bermuda's elite men competing on the world stage", link: "/programs/senior/mens" },
  { image: heroWomensNational, title: "Women's National", subtitle: "Team", description: "Pride, passion and power — Bermuda's women's volleyball", link: "/programs/senior/womens" },
  { image: heroGrassIndoor, title: "Grass & Indoor", subtitle: "Leagues", description: "Year-round competitive and recreational league play", link: "/leagues" },
];

const HeroSlider = () => {
  const [slides, setSlides] = useState<SlideData[]>(FALLBACK_SLIDES);
  const [current, setCurrent] = useState(0);
  const [prevSlide, setPrevSlide] = useState<number | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTransitioningRef = useRef(false);
  const currentRef = useRef(0);
  const slidesLengthRef = useRef(FALLBACK_SLIDES.length);

  // Load slides from Supabase; fall back to hardcoded defaults
  useEffect(() => {
    const load = async () => {
      const { data } = await (supabase as any)
        .from("hero_slides")
        .select("image_url, title, subtitle, description, link")
        .eq("enabled", true)
        .order("sort_order");
      if (data && data.length > 0) {
        const mapped = data.map((s: any, i: number) => ({
            image: s.image_url || FALLBACK_SLIDES[i % FALLBACK_SLIDES.length].image,
            title: s.title,
            subtitle: s.subtitle,
            description: s.description,
            link: s.link,
          }));
        setSlides(mapped);
        slidesLengthRef.current = mapped.length;
      }
    };
    load();
  }, []);

  const goTo = useCallback(
    (index: number) => {
      if (isTransitioningRef.current) return;
      isTransitioningRef.current = true;
      setIsTransitioning(true);
      setPrevSlide(currentRef.current);
      currentRef.current = index;
      setCurrent(index);
      // Clear any pending transition timeout before scheduling a new one
      if (transitionTimeoutRef.current !== null) {
        clearTimeout(transitionTimeoutRef.current);
      }
      transitionTimeoutRef.current = setTimeout(() => {
        isTransitioningRef.current = false;
        setIsTransitioning(false);
        setPrevSlide(null);
        transitionTimeoutRef.current = null;
      }, 700);
    },
    [] // No deps — uses refs to avoid recreating on every state change
  );

  const next = useCallback(() => goTo((currentRef.current + 1) % slidesLengthRef.current), [goTo]);
  const prev = useCallback(() => goTo((currentRef.current - 1 + slidesLengthRef.current) % slidesLengthRef.current), [goTo]);

  // Auto-advance — stable interval, never recreated (goTo and next are stable refs)
  useEffect(() => {
    const timer = setInterval(next, 6000);
    return () => {
      clearInterval(timer);
      if (transitionTimeoutRef.current !== null) {
        clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section className="relative h-[70vh] min-h-[500px] max-h-[800px] overflow-hidden bg-primary">
      {/* Slides — only render the visible slide and (during crossfade) the previous one.
           This avoids loading all 6 large images into memory simultaneously. */}
      {slides.map((slide, i) => {
        const isActive = i === current;
        const isPrev = i === prevSlide;
        if (!isActive && !isPrev) return null;
        return (
          <div
            key={i}
            className="absolute inset-0 transition-opacity duration-700 ease-in-out"
            style={{ opacity: isActive ? 1 : 0, zIndex: isActive ? 1 : 0 }}
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
        );
      })}

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

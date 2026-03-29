import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import bvaLogo from "@/assets/bva-logo.jpg";

const navItems = [
  { label: "Home", path: "/" },
  { label: "News", path: "/news" },
  { label: "Events", path: "/events" },
  { label: "Registration", path: "/registration" },
  { label: "Leagues & Tournaments", path: "/leagues" },
  {
    label: "Programs",
    path: "/programs",
    children: [
      { label: "Junior Program", path: "/programs/junior" },
      { label: "Paradise Hitters (Girls)", path: "/programs/junior/girls" },
      { label: "Big Wave Riders (Boys)", path: "/programs/junior/boys" },
      { label: "Senior National Teams", path: "/programs/senior" },
      { label: "Men's National Team", path: "/programs/senior/mens" },
      { label: "Women's National Team", path: "/programs/senior/womens" },
      { label: "Youth Camps", path: "/programs/youth-camps" },
    ],
  },
  { label: "Bursary", path: "/bursary" },
  { label: "Membership", path: "/membership" },
  { label: "Gallery", path: "/gallery" },
  { label: "About Us", path: "/about" },
];

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileSubmenuOpen, setMobileSubmenuOpen] = useState(false);
  const location = useLocation();
  const dropdownRef = useRef<HTMLLIElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
    setMobileSubmenuOpen(false);
    setDropdownOpen(false);
  }, [location.pathname]);

  const isActive = (path: string) => location.pathname === path;
  const isProgramsActive = location.pathname.startsWith("/programs");

  return (
    <header className="sticky top-0 z-50 bg-primary shadow-lg">
      <div className="h-1 bg-accent" />

      <nav className="container mx-auto flex items-center justify-between px-4 py-3">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3">
          <img src={bvaLogo} alt="BVA Logo" className="h-10 w-10 rounded-full object-contain" />
          <div className="hidden sm:block">
            <span className="font-heading text-lg font-semibold uppercase tracking-wide text-primary-foreground">
              Bermuda Volleyball
            </span>
          </div>
        </Link>

        {/* Desktop nav */}
        <ul className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) =>
            item.children ? (
              <li key={item.path} ref={dropdownRef} className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className={`flex items-center gap-1 rounded-md px-3 py-2 font-sans text-sm font-medium transition-colors hover:bg-accent/20 hover:text-accent ${
                    isProgramsActive ? "bg-accent/20 text-accent" : "text-primary-foreground/80"
                  }`}
                >
                  {item.label}
                  <ChevronDown className={`h-3 w-3 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
                </button>
                {dropdownOpen && (
                  <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-lg border bg-popover p-2 shadow-lg">
                    <Link
                      to={item.path}
                      className="block rounded-md px-3 py-2 text-sm font-medium text-popover-foreground transition-colors hover:bg-accent/20 hover:text-accent"
                    >
                      All Programs
                    </Link>
                    <div className="my-1 h-px bg-border" />
                    {item.children.map((child) => (
                      <Link
                        key={child.path}
                        to={child.path}
                        className={`block rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent/20 hover:text-accent ${
                          isActive(child.path) ? "bg-accent/20 text-accent font-medium" : "text-popover-foreground"
                        }`}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </li>
            ) : (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`rounded-md px-3 py-2 font-sans text-sm font-medium transition-colors hover:bg-accent/20 hover:text-accent ${
                    isActive(item.path) ? "bg-accent/20 text-accent" : "text-primary-foreground/80"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            )
          )}
        </ul>

        {/* Mobile toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="text-primary-foreground lg:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-accent/20 bg-primary lg:hidden">
          <ul className="container mx-auto flex flex-col gap-1 px-4 py-4">
            {navItems.map((item) =>
              item.children ? (
                <li key={item.path}>
                  <button
                    onClick={() => setMobileSubmenuOpen(!mobileSubmenuOpen)}
                    className={`flex w-full items-center justify-between rounded-md px-4 py-3 font-sans text-sm font-medium transition-colors hover:bg-accent/20 ${
                      isProgramsActive ? "bg-accent/20 text-accent" : "text-primary-foreground/80"
                    }`}
                  >
                    {item.label}
                    <ChevronDown className={`h-4 w-4 transition-transform ${mobileSubmenuOpen ? "rotate-180" : ""}`} />
                  </button>
                  {mobileSubmenuOpen && (
                    <ul className="ml-4 mt-1 space-y-1 border-l-2 border-accent/30 pl-4">
                      <li>
                        <Link
                          to={item.path}
                          className="block rounded-md px-4 py-2 text-sm text-primary-foreground/80 hover:bg-accent/20 hover:text-accent"
                        >
                          All Programs
                        </Link>
                      </li>
                      {item.children.map((child) => (
                        <li key={child.path}>
                          <Link
                            to={child.path}
                            className={`block rounded-md px-4 py-2 text-sm transition-colors hover:bg-accent/20 hover:text-accent ${
                              isActive(child.path) ? "bg-accent/20 text-accent" : "text-primary-foreground/80"
                            }`}
                          >
                            {child.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ) : (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`block rounded-md px-4 py-3 font-sans text-sm font-medium transition-colors hover:bg-accent/20 ${
                      isActive(item.path) ? "bg-accent/20 text-accent" : "text-primary-foreground/80"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              )
            )}
          </ul>
        </div>
      )}
    </header>
  );
};

export default Navbar;

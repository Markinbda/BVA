import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, ChevronDown, User, LogOut, ShieldCheck, Search, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAdminEditMode } from "@/contexts/AdminEditModeContext";
import { useAuth } from "@/hooks/useAuth";
import AuthModal from "@/components/AuthModal";
import bvaLogo from "@/assets/bva-logo.jpg";

const navItems = [
  { label: "Home", path: "/" },
  { label: "News", path: "/news" },
  { label: "Events", path: "/events" },
  {
    label: "Registration",
    path: "/registration",
    children: [
      { label: "Winter League Registration", path: "/registration/winter" },
      { label: "Beach Registration", path: "/registration/beach" },
      { label: "Indoor Camps", path: "/programs/youth-camps" },
      { label: "Financial Aid", path: "/bursary" },
    ],
  },
  {
    label: "Leagues & Tournaments",
    path: "/leagues",
    children: [
      { label: "Winter League", path: "/leagues/winter" },
      { label: "Spring League", path: "/leagues/spring" },
      { label: "Summer Beach League", path: "/summer-league" },
      { label: "Beach Tournaments", path: "/leagues/beach-tournaments" },
      { label: "Bermuda Open", path: "/leagues/bermuda-open" },
      { label: "Corporate Tournament", path: "/leagues/corporate" },
      { label: "NatWest Island Games", path: "/leagues/island-games" },
      { label: "BVA League Rules", path: "/leagues/rules" },
    ],
  },
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
      { label: "Coaching Program", path: "/programs/coaching" },
      { label: "Referee Program", path: "/programs/referee" },
    ],
  },
  {
    label: "Bursary",
    path: "/bursary",
    children: [
      { label: "Financial Aid", path: "/bursary" },
      { label: "Adopt-an-Athlete Program", path: "/bursary/adopt-an-athlete" },
      { label: "Youth Bursaries", path: "/bursary/youth-bursaries" },
    ],
  },
  { label: "Membership", path: "/membership" },
  {
    label: "Gallery",
    path: "/gallery",
    children: [
      { label: "Photos", path: "/gallery" },
      { label: "Videos", path: "/gallery/videos" },
      { label: "History", path: "/gallery/history" },
      { label: "Social Media", path: "/gallery/social" },
    ],
  },
  {
    label: "About Us",
    path: "/about",
    children: [
      { label: "Mission", path: "/about/mission" },
      { label: "Executives", path: "/about/executives" },
      { label: "Governing Bodies", path: "/about/governing-bodies" },
      { label: "Annual Reports", path: "/about/annual-reports" },
      { label: "Anti-Doping", path: "/about/anti-doping" },
    ],
  },
];

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [openMobileSubmenu, setOpenMobileSubmenu] = useState<string | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const location = useLocation();
  const navRef = useRef<HTMLUListElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { user, isAdmin, canEditContent, signOut, hasPermission } = useAuth();
  const { editMode, setEditMode } = useAdminEditMode();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setOpenMobileSubmenu(null);
    setOpenDropdown(null);
    setUserMenuOpen(false);
  }, [location.pathname]);

  const isActive = (path: string) => location.pathname === path;
  const isParentActive = (item: typeof navItems[0]) =>
    item.children
      ? location.pathname === item.path || item.children.some((c) => location.pathname === c.path)
      : location.pathname === item.path;

  const toggleDropdown = (path: string) =>
    setOpenDropdown((prev) => (prev === path ? null : path));

  const toggleMobileSubmenu = (path: string) =>
    setOpenMobileSubmenu((prev) => (prev === path ? null : path));

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
        <ul ref={navRef} className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) =>
            item.children ? (
              <li key={item.path} className="relative">
                <button
                  onClick={() => toggleDropdown(item.path)}
                  className={`flex items-center gap-1 rounded-md px-3 py-2 font-sans text-sm font-medium transition-colors hover:bg-accent/20 hover:text-accent ${
                    isParentActive(item) ? "bg-accent/20 text-accent" : "text-primary-foreground/80"
                  }`}
                >
                  {item.label}
                  <ChevronDown
                    className={`h-3 w-3 transition-transform ${openDropdown === item.path ? "rotate-180" : ""}`}
                  />
                </button>
                {openDropdown === item.path && (
                  <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-lg border bg-popover p-2 shadow-lg">
                    <Link
                      to={item.path}
                      className="block rounded-md px-3 py-2 text-sm font-medium text-popover-foreground transition-colors hover:bg-accent/20 hover:text-accent"
                    >
                      All {item.label}
                    </Link>
                    <div className="my-1 h-px bg-border" />
                    {item.children.map((child) => (
                      <Link
                        key={child.label}
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

        {/* Auth area */}
        <div className="flex items-center gap-2">
          {canEditContent ? (
            <Button size="sm" variant={editMode ? "secondary" : "outline"} onClick={() => setEditMode(!editMode)}>
              {editMode ? "Exit Edit Mode" : "Edit Mode"}
            </Button>
          ) : null}
          {user ? (
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen((p) => !p)}
                className="flex items-center gap-2 rounded-full bg-accent/20 px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-accent/30 transition-colors"
              >
                <User className="h-4 w-4" />
                <span className="hidden sm:inline max-w-[120px] truncate">
                  {user.user_metadata?.display_name || user.email}
                </span>
                <ChevronDown className={`h-3 w-3 transition-transform ${userMenuOpen ? "rotate-180" : ""}`} />
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border bg-popover p-2 shadow-lg">
                  <p className="px-3 py-1 text-xs text-muted-foreground truncate">{user.email}</p>
                  <div className="my-1 h-px bg-border" />
                  <Link
                    to="/profile"
                    className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-popover-foreground hover:bg-accent/20 hover:text-accent transition-colors"
                  >
                    <User className="h-4 w-4" />
                    My Profile
                  </Link>
                  <Link
                    to="/players"
                    className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-popover-foreground hover:bg-accent/20 hover:text-accent transition-colors"
                  >
                    <Search className="h-4 w-4" />
                    Find Players
                  </Link>
                  {(isAdmin || hasPermission("manage_coaches")) && (
                    <Link
                      to="/coach"
                      className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-popover-foreground hover:bg-accent/20 hover:text-accent transition-colors"
                    >
                      <GraduationCap className="h-4 w-4" />
                      Coach Portal
                    </Link>
                  )}
                  {isAdmin && (
                    <Link
                      to="/admin"
                      className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-popover-foreground hover:bg-accent/20 hover:text-accent transition-colors"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      Admin Panel
                    </Link>
                  )}
                  <div className="my-1 h-px bg-border" />
                  <button
                    onClick={() => { signOut(); setUserMenuOpen(false); }}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-popover-foreground hover:bg-accent/20 hover:text-accent transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="hidden lg:flex bg-white text-primary border-white hover:bg-primary hover:text-white hover:border-white transition-colors"
              onClick={() => setAuthModalOpen(true)}
            >
              Sign In
            </Button>
          )}

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
        </div>
      </nav>
      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-accent/20 bg-primary lg:hidden overflow-y-auto max-h-[calc(100dvh-56px)]">
          <ul className="container mx-auto flex flex-col gap-1 px-4 py-4">
            {!user && (
              <li>
                <button
                  onClick={() => { setMobileOpen(false); setAuthModalOpen(true); }}
                  className="block w-full rounded-md px-4 py-3 text-left font-sans text-sm font-medium text-primary-foreground/80 hover:bg-accent/20 transition-colors"
                >
                  Sign In / Register
                </button>
              </li>
            )}
            {user && (isAdmin || hasPermission("manage_coaches")) && (
              <li>
                <Link to="/coach" className="block rounded-md px-4 py-3 font-sans text-sm font-medium text-primary-foreground/80 hover:bg-accent/20 transition-colors">
                  Coach Portal
                </Link>
              </li>
            )}
            {user && isAdmin && (
              <li>
                <Link to="/admin" className="block rounded-md px-4 py-3 font-sans text-sm font-medium text-primary-foreground/80 hover:bg-accent/20 transition-colors">
                  Admin Panel
                </Link>
              </li>
            )}
            {user && (
              <li>
                <button
                  onClick={() => { signOut(); setMobileOpen(false); }}
                  className="block w-full rounded-md px-4 py-3 text-left font-sans text-sm font-medium text-primary-foreground/80 hover:bg-accent/20 transition-colors"
                >
                  Sign Out
                </button>
              </li>
            )}
            {navItems.map((item) =>
              item.children ? (
                <li key={item.path}>
                  <button
                    onClick={() => toggleMobileSubmenu(item.path)}
                    className={`flex w-full items-center justify-between rounded-md px-4 py-3 font-sans text-sm font-medium transition-colors hover:bg-accent/20 ${
                      isParentActive(item) ? "bg-accent/20 text-accent" : "text-primary-foreground/80"
                    }`}
                  >
                    {item.label}
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${openMobileSubmenu === item.path ? "rotate-180" : ""}`}
                    />
                  </button>
                  {openMobileSubmenu === item.path && (
                    <ul className="ml-4 mt-1 space-y-1 border-l-2 border-accent/30 pl-4">
                      <li>
                        <Link
                          to={item.path}
                          className="block rounded-md px-4 py-2 text-sm text-primary-foreground/80 hover:bg-accent/20 hover:text-accent"
                        >
                          All {item.label}
                        </Link>
                      </li>
                      {item.children.map((child) => (
                        <li key={child.label}>
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

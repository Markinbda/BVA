import { Link } from "react-router-dom";
import { Facebook, Instagram, Mail, MapPin } from "lucide-react";
import bvaLogo from "@/assets/bva-logo.jpg";

const Footer = () => {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="h-1 bg-accent" />
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* About */}
          <div>
            <div className="mb-4 flex items-center gap-3">
              <img src={bvaLogo} alt="BVA Logo" className="h-10 w-10 rounded-full object-contain" />
              <span className="font-heading text-lg font-semibold uppercase tracking-wide">BVA</span>
            </div>
            <p className="text-sm leading-relaxed text-primary-foreground/70">
              The Bermuda Volleyball Association has been promoting volleyball in Bermuda for over 50 years. 
              Registered Charity #646.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="mb-4 font-heading text-base font-semibold uppercase tracking-wide text-accent">
              Quick Links
            </h3>
            <ul className="space-y-2 text-sm">
              {[
                { label: "Membership", path: "/membership" },
                { label: "Registration", path: "/registration" },
                { label: "Programs", path: "/programs" },
                { label: "Leagues & Tournaments", path: "/leagues" },
                { label: "Gallery", path: "/gallery" },
              ].map((link) => (
                <li key={link.path}>
                  <Link to={link.path} className="text-primary-foreground/70 transition-colors hover:text-accent">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="mb-4 font-heading text-base font-semibold uppercase tracking-wide text-accent">
              Contact
            </h3>
            <ul className="space-y-3 text-sm text-primary-foreground/70">
              <li className="flex items-start gap-2">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <a href="mailto:bermudavolleyball@gmail.com" className="hover:text-accent">
                  bermudavolleyball@gmail.com
                </a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <span>Bermuda</span>
              </li>
            </ul>
          </div>

          {/* Social */}
          <div>
            <h3 className="mb-4 font-heading text-base font-semibold uppercase tracking-wide text-accent">
              Follow Us
            </h3>
            <div className="flex gap-3">
              <a
                href="https://www.facebook.com/bermudavolleyball"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/20 text-primary-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <Facebook className="h-5 w-5" />
              </a>
              <a
                href="https://www.instagram.com/bermudavolleyball"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/20 text-primary-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <Instagram className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-primary-foreground/10 pt-6 text-center text-xs text-primary-foreground/50">
          <p>© {new Date().getFullYear()} Bermuda Volleyball Association. All rights reserved.</p>
          <p className="mt-1">Affiliated with ECVA • NORCECA • FIVB</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

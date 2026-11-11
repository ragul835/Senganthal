import { Link } from "react-router-dom";
import { FaInstagram, FaFacebookF, FaWhatsapp, FaYoutube } from "react-icons/fa";
import { APP_TITLE } from "../../config/constants";
import "./Footer.css";

const SOCIAL_LINKS = [
  import.meta.env.VITE_INSTAGRAM_URL && { label: "Instagram", href: import.meta.env.VITE_INSTAGRAM_URL, icon: FaInstagram, color: "#E1306C" },
  import.meta.env.VITE_FACEBOOK_URL && { label: "Facebook", href: import.meta.env.VITE_FACEBOOK_URL, icon: FaFacebookF, color: "#1877F2" },
  import.meta.env.VITE_WHATSAPP_NUMBER && { label: "WhatsApp", href: `https://wa.me/${import.meta.env.VITE_WHATSAPP_NUMBER}`, icon: FaWhatsapp, color: "#25D366" },
  import.meta.env.VITE_YOUTUBE_URL && { label: "YouTube", href: import.meta.env.VITE_YOUTUBE_URL, icon: FaYoutube, color: "#FF0000" },
].filter((value): value is { label: string; href: string; icon: typeof FaInstagram; color: string } => Boolean(value));

const POLICY_LINKS = [
  { label: "Privacy Policy", path: "/privacy-policy" },
  { label: "Terms & Conditions", path: "/terms-and-conditions" },
  { label: "Shipping", path: "/shipping" },
  { label: "Returns", path: "/returns" },
];

const INFO_LINKS = [
  { label: "Our Story", path: "/our-story" },
  { label: "Contact Us", path: "/contact" },
];

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-main">
        {/* LEFT — Brand + Social */}
        <div className="footer-brand">
          <div className="footer-logo-row">
            <img
              src="/senganthal.jpg"
              alt={APP_TITLE}
              className="footer-logo-img"
            />
            <span className="footer-app-title">{APP_TITLE}</span>
          </div>

          <p className="footer-tagline">
            Elegance woven into every thread.
          </p>

          <div className="footer-socials">
            {SOCIAL_LINKS.map(({ label, href, icon: Icon, color }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="footer-social-btn"
                style={{ "--social-color": color } as React.CSSProperties}
              >
                <Icon />
                <span className="footer-social-label">{label}</span>
              </a>
            ))}
          </div>
        </div>

        {/* RIGHT — Policies & Info */}
        <div className="footer-links-wrapper">
          {/* Policies */}
          <div className="footer-link-group">
            <h4 className="footer-group-title">Policies</h4>
            <ul className="footer-link-list">
              {POLICY_LINKS.map(({ label, path }) => (
                <li key={path}>
                  <Link to={path} className="footer-link">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Info */}
          <div className="footer-link-group">
            <h4 className="footer-group-title">Info</h4>
            <ul className="footer-link-list">
              {INFO_LINKS.map(({ label, path }) => (
                <li key={path}>
                  <Link to={path} className="footer-link">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom copyright bar */}
      <div className="footer-bottom">
        <p className="footer-copyright">
          &copy; {currentYear} {APP_TITLE}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

export default Footer;

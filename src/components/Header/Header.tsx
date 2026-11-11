import { useState, type FormEvent } from "react";
import { TbHome2, TbUserCog } from "react-icons/tb";
import { MdOutlineNewReleases, MdSearch, MdOutlineShoppingCart, MdRateReview } from "react-icons/md";
import { LuPhone, LuCommand } from "react-icons/lu";
import { FiEye, FiEyeOff } from "react-icons/fi";

import { FaBars, FaTimes } from "react-icons/fa";
import "./Header.css";
import { APP_TITLE } from "../../config/constants";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../../state/useCart";
import { loginAdmin, requestPasswordReset } from "../../services/auth";

const MENU_ITEMS = [
  { label: "Home", path: "/", icon: TbHome2 },
  { label: "Search", path: "/search", icon: MdSearch },
  { label: "Fresh Arrivals", path: "/new-arrivals", icon: MdOutlineNewReleases },
  { label: "Upcoming", path: "/upcoming", icon: LuCommand },
  { label: "Customer Reviews", path: "/reviews", icon: MdRateReview },
  { label: "Track order", path: "/track-order", icon: MdOutlineShoppingCart },
];

const UTILITY_MENU_ITEMS = [
  { label: "Contact Us", path: "/contact", icon: LuPhone },
];

function AdminLoginPopover({ onClose, idPrefix }: { onClose: () => void; idPrefix: string }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [recover, setRecover] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      if (recover) {
        await requestPasswordReset(email.trim());
        setMessage("If this email is registered, a password reset link has been sent.");
      } else {
        await loginAdmin(email.trim(), password);
        onClose();
        navigate("/admin");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function toggleRecovery() {
    setRecover(current => !current);
    setPassword("");
    setShowPassword(false);
    setMessage("");
  }

  return (
    <div className="admin-login-popover" role="dialog" aria-modal="false" aria-labelledby={`${idPrefix}-title`}>
      <div className="admin-popover-header">
        <h3 id={`${idPrefix}-title`}>{recover ? "Reset password" : "Admin login"}</h3>
        <button type="button" className="admin-popover-close" onClick={onClose} aria-label="Close admin login">×</button>
      </div>
      <form className="admin-popover-form" onSubmit={submit}>
        <label htmlFor={`${idPrefix}-email`}>Email</label>
        <input id={`${idPrefix}-email`} type="email" required autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} autoFocus />
        {!recover && <>
          <label htmlFor={`${idPrefix}-password`}>Password</label>
          <div className="admin-popover-password">
            <input id={`${idPrefix}-password`} type={showPassword ? "text" : "password"} required autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} />
            <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword(current => !current)}>
              {showPassword ? <FiEyeOff aria-hidden="true" /> : <FiEye aria-hidden="true" />}
            </button>
          </div>
        </>}
        <button type="submit" className="admin-popover-submit" disabled={busy}>
          {busy ? "Please wait…" : recover ? "Send reset link" : "Log in"}
        </button>
      </form>
      <button type="button" className="admin-popover-recovery" onClick={toggleRecovery} disabled={busy}>
        {recover ? "Back to login" : "Forgot password?"}
      </button>
      {message && <p className="admin-popover-message" role="status">{message}</p>}
    </div>
  );
}

function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [desktopSidebarExpanded, setDesktopSidebarExpanded] = useState(false);
  const [desktopAdminOpen, setDesktopAdminOpen] = useState(false);
  const [mobileAdminOpen, setMobileAdminOpen] = useState(false);
  const { items } = useCart();
  const cartItemCount = items.reduce((total, item) => total + item.quantity, 0);

  return (
    <>
      <header className="header">
        <div className="header-left">
          <button
            className="icon btn-menu"
            onClick={() => setMobileMenuOpen((s) => !s)}
            aria-label="Toggle menu"
          >
            <FaBars />
          </button>
        </div>

        <h2 className="logo">{APP_TITLE}</h2>

        <div className="header-actions">
          <Link to="/search" className="header-icon-link" aria-label="Search">
            <MdSearch className="icon" />
          </Link>
          <Link to="/cart" className="header-icon-link cart-icon-link" aria-label={`Shopping cart, ${cartItemCount} ${cartItemCount === 1 ? "item" : "items"}`}>
            <MdOutlineShoppingCart className="icon" />
            {cartItemCount > 0 && <span className="cart-count-badge" aria-hidden="true">{cartItemCount}</span>}
          </Link>
        </div>
      </header>

      {/* Desktop Sidebar - Icons only, expands on hover */}
      <aside
        className="desktop-sidebar"
        onMouseEnter={() => setDesktopSidebarExpanded(true)}
        onMouseLeave={() => setDesktopSidebarExpanded(false)}
      >
        <nav className={`icon-nav icon-nav-main ${desktopSidebarExpanded ? "expanded" : ""}`} aria-label="Main navigation">
          {MENU_ITEMS.map((item) => {
            const IconComponent = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className="icon-menu-item"
                title={item.label}
              >
                <IconComponent className="icon-large" />
                <span className="icon-label">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <nav className={`icon-nav icon-nav-utility ${desktopSidebarExpanded ? "expanded" : ""}`} aria-label="Contact and administration">
          {UTILITY_MENU_ITEMS.map((item) => {
            const IconComponent = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className="icon-menu-item"
                title={item.label}
              >
                <IconComponent className="icon-large" />
                <span className="icon-label">{item.label}</span>
              </Link>
            );
          })}
          <div className="admin-login-menu">
            <button
              type="button"
              className="icon-menu-item admin-login-trigger"
              title="Admin login"
              aria-haspopup="dialog"
              aria-expanded={desktopAdminOpen}
              onClick={() => {
                setDesktopSidebarExpanded(true);
                setDesktopAdminOpen(current => !current);
              }}
            >
              <TbUserCog className="icon-large" />
              <span className="icon-label">Admin login</span>
            </button>
            {desktopAdminOpen && <AdminLoginPopover idPrefix="desktop-admin" onClose={() => setDesktopAdminOpen(false)} />}
          </div>
        </nav>
      </aside>

      {/* Mobile Sidebar - Hamburger menu */}
      {mobileMenuOpen && (
        <>
          <div
            className="overlay"
            onClick={() => setMobileMenuOpen(false)}
          />

          <aside className="mobile-sidebar" aria-hidden={!mobileMenuOpen}>
            <button
              className="close-btn"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close menu"
            >
              <FaTimes />
            </button>

            <ul className="sidebar-list">
              {MENU_ITEMS.map((item) => {
                const IconComponent = item.icon;
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className="sidebar-link"
                    >
                      <IconComponent className="sidebar-icon" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
            <ul className="sidebar-list sidebar-list-utility">
              {UTILITY_MENU_ITEMS.map((item) => {
                const IconComponent = item.icon;
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className="sidebar-link"
                    >
                      <IconComponent className="sidebar-icon" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
              <li className="mobile-admin-login-menu">
                <button
                  type="button"
                  className="sidebar-link admin-login-mobile-trigger"
                  aria-haspopup="dialog"
                  aria-expanded={mobileAdminOpen}
                  onClick={() => setMobileAdminOpen(current => !current)}
                >
                  <TbUserCog className="sidebar-icon" />
                  Admin login
                </button>
                {mobileAdminOpen && <AdminLoginPopover idPrefix="mobile-admin" onClose={() => setMobileAdminOpen(false)} />}
              </li>
            </ul>
          </aside>
        </>
      )}
    </>
  );
}

export default Header;

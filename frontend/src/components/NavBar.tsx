import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import { useCart } from "../cart";
import { BulldogIcon, CartIcon } from "./icons";

const LINKS = [
  { to: "/", label: "Home", end: true },
  { to: "/products", label: "Shop All" },
  { to: "/about", label: "About Us" },
];

export function NavBar() {
  const { user, logout } = useAuth();
  const { itemCount } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  // A narrow screen's menu shouldn't stay open after the shopper taps a
  // link and the route actually changes underneath it.
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  return (
    <header className="nav">
      <div className="nav__inner">
        <NavLink to="/" className="nav__brand">
          <span className="nav__mark">
            <BulldogIcon className="nav__mark-icon" />
          </span>
          <span className="nav__wordmark">Campus Customs</span>
        </NavLink>

        <button
          className="nav__burger"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
        >
          <span />
          <span />
          <span />
        </button>

        <div className={`nav__menu ${menuOpen ? "is-open" : ""}`}>
          <nav className="nav__links" aria-label="Main">
            {LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `nav__link ${isActive ? "is-active" : ""}`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="nav__auth">
            <NavLink to="/cart" className="nav__cart" aria-label="Cart">
              <CartIcon className="nav__cart-icon" />
              {itemCount > 0 && <span className="nav__cart-badge">{itemCount}</span>}
            </NavLink>
            {user ? (
              <>
                <span className="nav__greeting">
                  Hi, {user.first_name ?? user.name}
                </span>
                <button
                  className="nav__link"
                  onClick={() => {
                    logout();
                    navigate("/");
                  }}
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className="nav__link">
                  Log in
                </NavLink>
                <NavLink to="/signup" className="nav__cta">
                  Create an Account
                </NavLink>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

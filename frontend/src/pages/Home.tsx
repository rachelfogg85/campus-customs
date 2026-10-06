import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchProducts, type Product } from "../api";
import { BulldogIcon, CampusIcon } from "../components/icons";
import { ProductCard } from "../components/ProductCard";
import { useChatUI } from "../chatUI";

const FEATURES = [
  {
    title: "Everyday Bulldog Gear",
    body: "Hoodies, crewnecks, and tees built for lecture halls, late-night libraries, and everything after.",
    Icon: BulldogIcon,
  },
  {
    title: "Every Corner of Campus",
    body: "Residential colleges, club sports, and grad schools all get real representation — not just the big crest.",
    Icon: CampusIcon,
  },
];

const ASK_BANNER = {
  title: "Ask Before You Buy",
  body: "Connect with us before committing.",
};

export default function Home() {
  const [featured, setFeatured] = useState<Product[]>([]);
  const { openChat } = useChatUI();

  useEffect(() => {
    const controller = new AbortController();
    fetchProducts(controller.signal)
      .then((res) => setFeatured(res.products.slice(0, 4)))
      .catch(() => {
        /* Home page degrades gracefully without the featured strip. */
      });
    return () => controller.abort();
  }, []);

  return (
    <div className="page">
      <section className="hero">
        <div className="hero__text">
          <span className="eyebrow">Campus Customs</span>
          <h1>Gear that actually feels like you.</h1>
          <p>
            From Old Campus to the res colleges, we make the stuff you reach
            for on a Tuesday — not just the stuff you wear once at
            graduation.
          </p>
          <Link to="/products" className="btn btn--primary">
            Shop All
          </Link>
        </div>
      </section>

      <section className="features">
        <div className="features__row">
          {FEATURES.map((f) => (
            <div key={f.title} className="feature">
              <f.Icon className="feature__icon" />
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </div>
          ))}
        </div>
        <div className="feature-banner">
          <button className="feature-banner__cta" onClick={openChat}>
            💬 Chat with us
          </button>
          <div className="feature-banner__text">
            <h3>{ASK_BANNER.title}</h3>
            <p>{ASK_BANNER.body}</p>
          </div>
        </div>
      </section>

      {featured.length > 0 && (
        <section className="home-products">
          <div className="home-products__head">
            <h2>New to our collection</h2>
            <Link to="/products">Shop All →</Link>
          </div>
          <div className="grid">
            {featured.map((p) => (
              <ProductCard key={p.product_id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

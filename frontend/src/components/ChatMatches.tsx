import { useLocation } from "react-router-dom";
import { useChatMatches } from "../chatMatches";
import { ProductCard } from "./ProductCard";

/**
 * Renders wherever the shopper currently is on the site — the moment the
 * chat agent's tools return products, they show up here as the same
 * ProductCard used on the Products page, so clicking one opens the same
 * detail view built in Problem 3. Nothing special was needed for that: it's
 * the identical component and route, just fed from chat instead of the grid.
 */
export function ChatMatches() {
  const { query, products, clear } = useChatMatches();
  const location = useLocation();

  // Hidden on a single product's own page — the shopper is already focused
  // on one item there, so a shelf of other matches above it is just noise
  // pushing the thing they clicked on further down the screen. Same
  // reasoning on the cart page: that's a focused task too.
  if (
    products.length === 0 ||
    /^\/products\/.+/.test(location.pathname) ||
    location.pathname === "/cart"
  ) {
    return null;
  }

  return (
    <section className="chat-matches" aria-label="Items from your chat">
      <div className="chat-matches__head">
        <div>
          <span className="eyebrow">From your chat</span>
          <h2>{query ? `Matches for “${query}”` : "Matching items"}</h2>
        </div>
        <button className="chat-matches__clear" onClick={clear}>
          Clear
        </button>
      </div>
      <div className="grid">
        {products.map((p) => (
          <ProductCard key={p.product_id} product={p} />
        ))}
      </div>
    </section>
  );
}

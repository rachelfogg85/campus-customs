import { Link } from "react-router-dom";
import { imageUrl, type Product } from "../api";

/** Trim prose to a card-friendly length without cutting mid-word. */
function clip(text: string, limit: number): string {
  if (text.length <= limit) return text;
  return text.slice(0, limit).replace(/\s+\S*$/, "") + "…";
}

// Below this, a product is scarce enough across every size combined that
// flagging it nudges an undecided shopper — above it, nearly everything in
// the catalog would qualify and the badge would stop meaning anything.
// Exported so the Products page's "Low stock only" filter uses the exact
// same cutoff the badge does — one number can't drift from the other.
export const LOW_STOCK_THRESHOLD = 20;

export function ProductCard({ product }: { product: Product }) {
  const outOfStock = product.total_stock === 0;
  const lowStock = !outOfStock && product.total_stock <= LOW_STOCK_THRESHOLD;

  return (
    <Link to={`/products/${product.product_id}`} className="product-card">
      <div className="product-card__image">
        <img src={imageUrl(product)} alt={product.name} loading="lazy" />
        {outOfStock && <span className="product-card__badge">Sold out</span>}
        {lowStock && (
          <span className="product-card__badge product-card__badge--low">
            Only {product.total_stock} left
          </span>
        )}
      </div>
      <div className="product-card__body">
        <h3 className="product-card__name" title={product.name}>
          {product.name}
        </h3>
        <p className="product-card__desc">{clip(product.description, 80)}</p>
        <div className="product-card__foot">
          <span className="product-card__price">${product.price.toFixed(2)}</span>
          <span className="product-card__type" title={product.garment_type}>
            {product.garment_type}
          </span>
        </div>
      </div>
    </Link>
  );
}

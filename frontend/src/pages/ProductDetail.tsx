import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchProduct, imageUrl, type Product } from "../api";
import { useCart } from "../cart";

export default function ProductDetail() {
  const { productId } = useParams<{ productId: string }>();
  const { addItem } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!productId) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setSelectedSize(null);
    setQuantity(1);
    setAdded(false);
    fetchProduct(productId, controller.signal)
      .then(setProduct)
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(
          err instanceof Error ? err.message : "Could not load this product.",
        );
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [productId]);

  if (loading) {
    return (
      <div className="page">
        <p className="notice">Loading…</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="page">
        <div className="notice notice--error">
          {error ?? "Product not found."}
        </div>
        <Link to="/products" className="btn btn--secondary">
          ← Back to products
        </Link>
      </div>
    );
  }

  const selectedStock = selectedSize
    ? product.inventory.find((i) => i.size === selectedSize)?.quantity ?? 0
    : 0;

  function handleAddToCart() {
    if (!product || !selectedSize || selectedStock === 0) return;
    void addItem(product, selectedSize, quantity).then(() => {
      setAdded(true);
      setQuantity(1);
    });
  }

  return (
    <div className="page">
      <Link to="/products" className="back-link">
        ← Back to products
      </Link>

      <div className="detail">
        <div className="detail__image">
          <img src={imageUrl(product)} alt={product.name} />
        </div>

        <div className="detail__info">
          <span className="eyebrow">{product.garment_type}</span>
          <h1>{product.name}</h1>
          <p className="detail__price">${product.price.toFixed(2)}</p>

          <p className="detail__desc">{product.description}</p>

          {product.colors.length > 0 && (
            <div className="detail__row">
              <h4>Colors</h4>
              <div className="chips">
                {product.colors.map((c) => (
                  <span key={c} className="chip">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="detail__row">
            <h4>Size</h4>
            <div className="size-picker">
              {product.inventory.map((entry) => {
                const outOfStock = entry.quantity === 0;
                return (
                  <button
                    key={entry.size}
                    type="button"
                    className={`size-option ${selectedSize === entry.size ? "is-selected" : ""} ${outOfStock ? "is-disabled" : ""}`}
                    disabled={outOfStock}
                    onClick={() => {
                      setSelectedSize(entry.size);
                      setQuantity(1);
                      setAdded(false);
                    }}
                    title={outOfStock ? `${entry.size} — out of stock` : `${entry.size} — ${entry.quantity} in stock`}
                  >
                    {entry.size}
                  </button>
                );
              })}
            </div>
            <p className="detail__total-stock">
              {product.total_stock > 0
                ? `${product.total_stock} total units across all sizes.`
                : "Currently sold out in every size."}
            </p>
          </div>

          <div className="detail__row detail__add-to-cart">
            <div className="qty-stepper">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={!selectedSize}
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span>{quantity}</span>
              <button
                type="button"
                onClick={() =>
                  setQuantity((q) => Math.min(selectedStock || 1, q + 1))
                }
                disabled={!selectedSize || quantity >= selectedStock}
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
            <button
              type="button"
              className="btn btn--primary"
              onClick={handleAddToCart}
              disabled={!selectedSize || selectedStock === 0}
            >
              {!selectedSize
                ? "Select a size"
                : selectedStock === 0
                  ? "Out of stock"
                  : "Add to Cart"}
            </button>
          </div>
          {added && (
            <p className="detail__added-note">
              Added to your cart. <Link to="/cart">View cart →</Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

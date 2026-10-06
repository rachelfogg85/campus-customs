import { Link } from "react-router-dom";
import { imageUrl } from "../api";
import { useCart } from "../cart";

export default function Cart() {
  const { items, subtotal, itemCount, setQuantity } = useCart();

  if (items.length === 0) {
    return (
      <div className="page page--narrow">
        <div className="page__head">
          <h1>Your Cart</h1>
        </div>
        <div className="notice">
          Your cart is empty.{" "}
          <Link to="/products">Shop the collection →</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page page--narrow">
      <div className="page__head">
        <h1>Your Cart</h1>
        <p>
          {itemCount} {itemCount === 1 ? "item" : "items"}
        </p>
      </div>

      <div className="cart-lines">
        {items.map((line) => (
          <div key={`${line.product.product_id}-${line.size}`} className="cart-line">
            <Link to={`/products/${line.product.product_id}`} className="cart-line__image">
              <img src={imageUrl(line.product)} alt={line.product.name} />
            </Link>
            <div className="cart-line__info">
              <Link to={`/products/${line.product.product_id}`} className="cart-line__name">
                {line.product.name}
              </Link>
              <p className="cart-line__meta">Size {line.size}</p>
              <p className="cart-line__price">${line.product.price.toFixed(2)}</p>
            </div>
            <div className="cart-line__controls">
              <div className="qty-stepper">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  onClick={() =>
                    setQuantity(line.product.product_id, line.size, line.quantity - 1)
                  }
                >
                  −
                </button>
                <span>{line.quantity}</span>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  disabled={
                    line.quantity >=
                    (line.product.inventory.find((i) => i.size === line.size)?.quantity ?? 0)
                  }
                  onClick={() =>
                    setQuantity(line.product.product_id, line.size, line.quantity + 1)
                  }
                >
                  +
                </button>
              </div>
              <button
                type="button"
                className="cart-line__remove"
                onClick={() => setQuantity(line.product.product_id, line.size, 0)}
              >
                Remove
              </button>
            </div>
            <div className="cart-line__total">
              ${(line.product.price * line.quantity).toFixed(2)}
            </div>
          </div>
        ))}
      </div>

      <div className="cart-summary">
        <span>Subtotal</span>
        <span className="cart-summary__amount">${subtotal.toFixed(2)}</span>
      </div>
      <p className="cart-summary__note">
        This demo store doesn't process real orders — there's no checkout or
        payment step. Your cart is saved here so you can see it work.
      </p>
    </div>
  );
}

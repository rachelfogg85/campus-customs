import { useEffect, useMemo, useState } from "react";
import { fetchProducts, type Product } from "../api";
import { LOW_STOCK_THRESHOLD, ProductCard } from "../components/ProductCard";
import { categoryFor } from "../garmentCategories";

type SortOrder = "relevance" | "price-asc" | "price-desc";

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [garmentType, setGarmentType] = useState("All");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [sort, setSort] = useState<SortOrder>("relevance");

  useEffect(() => {
    const controller = new AbortController();
    fetchProducts(controller.signal)
      .then((res) => setProducts(res.products))
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(
          err instanceof Error
            ? `${err.message} — is the backend running on port 8000?`
            : "Could not load products.",
        );
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const garmentTypes = useMemo(() => {
    const seen = new Set<string>();
    for (const p of products) seen.add(categoryFor(p.garment_type));
    return ["All", ...[...seen].sort()];
  }, [products]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matches = products.filter((p) => {
      const matchesType =
        garmentType === "All" || categoryFor(p.garment_type) === garmentType;
      const matchesStock =
        !lowStockOnly ||
        (p.total_stock > 0 && p.total_stock <= LOW_STOCK_THRESHOLD);
      const matchesQuery =
        !needle ||
        p.name.toLowerCase().includes(needle) ||
        p.description.toLowerCase().includes(needle) ||
        p.search_tags.some((t) => t.toLowerCase().includes(needle));
      return matchesType && matchesStock && matchesQuery;
    });

    if (sort === "price-asc") return [...matches].sort((a, b) => a.price - b.price);
    if (sort === "price-desc") return [...matches].sort((a, b) => b.price - a.price);
    return matches;
  }, [products, query, garmentType, lowStockOnly, sort]);

  return (
    <div className="page">
      <div className="page__head">
        <h1>Products</h1>
        <p>{products.length} items in the Campus Customs catalog.</p>
      </div>

      <div className="toolbar">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, tag, or description…"
          aria-label="Search products"
        />
        <select
          value={garmentType}
          onChange={(e) => setGarmentType(e.target.value)}
          aria-label="Filter by garment type"
        >
          {garmentTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOrder)}
          aria-label="Sort by"
        >
          <option value="relevance">Sort: Featured</option>
          <option value="price-asc">Price: Low to High</option>
          <option value="price-desc">Price: High to Low</option>
        </select>
        <label className="toolbar__checkbox">
          <input
            type="checkbox"
            checked={lowStockOnly}
            onChange={(e) => setLowStockOnly(e.target.checked)}
          />
          Low stock only
        </label>
      </div>

      {error && <div className="notice notice--error">{error}</div>}

      {loading && (
        <div className="grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="product-card product-card--skeleton" />
          ))}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="notice">No products match your search.</div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="grid">
          {filtered.map((p) => (
            <ProductCard key={p.product_id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}

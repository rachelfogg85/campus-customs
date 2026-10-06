/**
 * Maps the catalog's raw `garment_type` values (22 distinct strings, mostly
 * near-duplicates — "crewneck" vs "crewneck sweatshirt", three different
 * flavors of "pullover") onto a short list of categories a shopper would
 * actually browse by. Used only for the Products page filter dropdown —
 * product cards still show the specific raw `garment_type` from the
 * database, so nothing about the catalog's own data changes, just how it's
 * grouped for filtering.
 *
 * Any `garment_type` not listed here falls back to itself (title-cased) in
 * `categoryFor`, so a new catalog row with an unmapped type still shows up
 * as its own filter option instead of silently disappearing.
 */
const GARMENT_CATEGORY_MAP: Record<string, string> = {
  // Hoodies — anything with a hood, pullover or zip.
  "hoodie": "Hoodies",
  "pullover hoodie": "Hoodies",
  "hooded sweatshirt": "Hoodies",
  "hooded pullover sweatshirt": "Hoodies",
  "full-zip hooded sweatshirt": "Hoodies",

  // Crewnecks — collared sweatshirts with no hood and no zip.
  "crewneck": "Crewnecks",
  "crewneck sweatshirt": "Crewnecks",
  "raglan crewneck sweatshirt": "Crewnecks",
  "mockneck sweatshirt": "Crewnecks",

  // Pullovers — zip-neck pullovers, no hood.
  "quarter-zip pullover": "Pullovers",
  "quarter-zip pullover sweatshirt": "Pullovers",

  // T-Shirts — every short-sleeve tee variant, regardless of neckline/weight.
  "t-shirt": "T-Shirts",
  "short-sleeve t-shirt": "T-Shirts",
  "short-sleeve T-shirt": "T-Shirts",
  "short-sleeve crew-neck t-shirt": "T-Shirts",
  "heavyweight short-sleeve t-shirt": "T-Shirts",

  // Performance Shirts — athletic/wicking fabric, a different garment than a tee.
  "long-sleeve performance shirt": "Performance Shirts",
  "men's long-sleeve performance shirt": "Performance Shirts",

  // Jackets.
  "jacket": "Jackets",
  "bomber jacket": "Jackets",
  "fleece jacket": "Jackets",
  "full-zip fleece jacket": "Jackets",
};

export function categoryFor(garmentType: string): string {
  return (
    GARMENT_CATEGORY_MAP[garmentType] ??
    garmentType.replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

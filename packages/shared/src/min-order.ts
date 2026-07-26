/**
 * Default minimum order qty. For now every kg (and piece) item defaults to 1.
 */
export function defaultMinOrderQty(_nameOrSlug?: string, _unit = "kg"): number {
  return 1;
}

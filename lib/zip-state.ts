import { lookup } from "zipcodes";

export function stateForZip(zip: string): string | null {
  if (!/^\d{5}$/.test(zip)) return null;
  const state = lookup(zip)?.state;
  return state && /^[A-Z]{2}$/.test(state) ? state : null;
}

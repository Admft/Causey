/** Shared result envelope for server actions (files under lib/actions). */
export type ActionResult<T = object> =
  | ({ ok: true } & T)
  | { ok: false; error: string };

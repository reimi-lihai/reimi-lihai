import type ja from "./ja";

/** Widen every string-literal leaf of the base dictionary to `string`,
 *  so translations can supply their own text while keeping the exact shape. */
type Widen<T> = T extends string
  ? string
  : { [K in keyof T]: Widen<T[K]> };

export type Dictionary = Widen<typeof ja>;

import { NextResponse } from "next/server";
import { HttpError } from "./auth/session";

/** Wrap a route handler: maps HttpError → JSON, logs anything else as 500. */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (e) {
      if (e instanceof HttpError) return NextResponse.json({ ok: false, error: e.code }, { status: e.status });
      console.error(e);
      return NextResponse.json({ ok: false, error: "internal" }, { status: 500 });
    }
  };
}

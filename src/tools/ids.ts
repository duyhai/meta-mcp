import { z } from "zod";

/**
 * Graph object ids that tools splice into a request path. Instagram media
 * and comment ids are numeric; Facebook post/comment ids are `<page>_<n>`.
 * Anything else (`/`, `?`, `..`, `&`) could point a named read at another
 * Graph endpoint, so the schema rejects it before a request is built.
 */
export const graphId = () =>
  z.string().regex(/^[0-9]+(_[0-9]+)*$/, "must be a numeric Graph id (digits, optionally joined by _)");

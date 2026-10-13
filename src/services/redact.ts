/**
 * Strip access tokens from Graph API responses before they reach the model.
 *
 * The Graph API embeds the caller's access_token in paging.next/previous URLs,
 * so passing responses through verbatim leaks the token into conversation
 * context. Pagination keeps working: cursors (paging.cursors.before/after) are
 * untouched, and the tools accept cursors, not URLs.
 *
 * Literal `access_token` fields (token exchange/refresh responses) are also
 * redacted: this fork's posture is that tokens are minted and stored outside
 * the conversation, never surfaced through tool output.
 */

const URL_TOKEN_RE = /\b(access_token=)[^&\s"']+/g;
const JSON_TOKEN_RE = /("access_token"\s*:\s*")[^"]*(")/g;

/** Redact both the URL form (access_token=…) and the quoted JSON form
 * ("access_token":"…") inside a plain string, e.g. a raw response body. */
export function redactTokenText(text: string): string {
  return text
    .replace(URL_TOKEN_RE, "$1REDACTED")
    .replace(JSON_TOKEN_RE, "$1REDACTED$2");
}

export function redactAccessTokens(value: unknown): unknown {
  if (typeof value === "string") {
    return redactTokenText(value);
  }
  if (Array.isArray(value)) {
    return value.map(redactAccessTokens);
  }
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = k === "access_token" ? "REDACTED" : redactAccessTokens(v);
    }
    return out;
  }
  return value;
}

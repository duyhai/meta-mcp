export type MetaTokenPlatform = "instagram" | "threads";

export interface TokenRequestSpec {
  baseUrl: string;
  path: string;
  token: string;
  params: Record<string, unknown>;
}

export interface SpoilerRange {
  offset: number;
  length: number;
}

export const INSTAGRAM_GRAPH_BASE = "https://graph.facebook.com/v26.0";
export const THREADS_GRAPH_BASE = "https://graph.threads.net/v1.0";
export const THREADS_AUTH_BASE = "https://graph.threads.net";

export function buildTokenRefreshRequest(
  platform: MetaTokenPlatform,
  longToken: string,
  appId: string,
  appSecret: string
): TokenRequestSpec {
  if (platform === "threads") {
    return {
      baseUrl: THREADS_AUTH_BASE,
      path: "/refresh_access_token",
      token: longToken,
      params: { grant_type: "th_refresh_token" },
    };
  }

  if (!appId || !appSecret) {
    throw new Error(
      "META_APP_ID and META_APP_SECRET are required to extend an Instagram/Facebook token."
    );
  }

  return {
    baseUrl: INSTAGRAM_GRAPH_BASE,
    path: "/oauth/access_token",
    token: longToken,
    params: {
      grant_type: "fb_exchange_token",
      client_id: appId,
      client_secret: appSecret,
      fb_exchange_token: longToken,
    },
  };
}

export function buildInstagramStoryParams(
  mediaType: "IMAGE" | "VIDEO",
  mediaUrl: string
): Record<string, unknown> {
  return mediaType === "IMAGE"
    ? { media_type: "STORIES", image_url: mediaUrl }
    : { media_type: "STORIES", video_url: mediaUrl };
}

export function buildThreadsPollAttachment(options: string[]): string {
  if (options.length < 2 || options.length > 4) {
    throw new Error("Threads polls require between 2 and 4 options.");
  }

  const attachment: Record<string, string> = {};
  options.forEach((option, index) => {
    if (option.length < 1 || option.length > 25) {
      throw new Error("Each Threads poll option must contain 1 to 25 characters.");
    }
    attachment[`option_${String.fromCharCode(97 + index)}`] = option;
  });

  return JSON.stringify(attachment);
}

export function buildThreadsTextEntities(
  text: string,
  markEntireText: boolean,
  ranges?: SpoilerRange[]
): string | undefined {
  const effectiveRanges = ranges?.length
    ? ranges
    : markEntireText && text.length > 0
      ? [{ offset: 0, length: text.length }]
      : [];

  if (effectiveRanges.length === 0) return undefined;
  if (effectiveRanges.length > 10) {
    throw new Error("Threads supports at most 10 spoiler ranges per post.");
  }

  for (const range of effectiveRanges) {
    if (
      !Number.isInteger(range.offset) ||
      !Number.isInteger(range.length) ||
      range.offset < 0 ||
      range.length < 1 ||
      range.offset + range.length > text.length
    ) {
      throw new Error("Spoiler ranges must be positive integer ranges within the post text.");
    }
  }

  return JSON.stringify(
    effectiveRanges.map(({ offset, length }) => ({
      entity_type: "SPOILER",
      offset,
      length,
    }))
  );
}

export function buildInstagramMessageBody(
  recipientId: string,
  message: string
): Record<string, unknown> {
  return {
    recipient: { id: recipientId },
    message: { text: message },
    messaging_type: "RESPONSE",
  };
}

export function buildInstagramConversationParams(
  folder?: "inbox" | "spam",
  limit?: number,
  after?: string
): Record<string, unknown> {
  const params: Record<string, unknown> = {
    platform: "instagram",
    fields: "id,updated_time,participants,messages{id,message,from,created_time}",
  };
  if (folder) params.folder = folder;
  if (limit !== undefined) params.limit = limit;
  if (after) params.after = after;
  return params;
}

export function buildThreadsUserInsightParams(
  metric: string,
  since?: string,
  until?: string,
  breakdown?: "country" | "city" | "age" | "gender"
): Record<string, unknown> {
  const metrics = metric.split(",").map((value) => value.trim());
  if (metrics.includes("follower_demographics") && !breakdown) {
    throw new Error(
      "breakdown is required for follower_demographics (country, city, age, or gender)."
    );
  }

  const params: Record<string, unknown> = { metric };
  if (since) params.since = since;
  if (until) params.until = until;
  if (breakdown) params.breakdown = breakdown;
  return params;
}

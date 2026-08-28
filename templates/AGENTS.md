# Meta MCP — Instructions for Codex / AI Agents

This project uses the **meta-mcp** MCP server for Instagram Graph API (v26.0), Threads API, and Meta platform management.

## Setup

The MCP server is configured in your MCP settings. It requires environment variables for each platform you use:

**Instagram**: `INSTAGRAM_ACCESS_TOKEN`, `INSTAGRAM_USER_ID`
**Instagram DMs (Facebook Login)**: `INSTAGRAM_MESSAGING_ACCESS_TOKEN`, `INSTAGRAM_PAGE_ID`
**Threads**: `THREADS_ACCESS_TOKEN`, `THREADS_USER_ID`
**Meta (tokens/webhooks)**: `META_APP_ID`, `META_APP_SECRET`

## Tool Reference

### Meta Platform (6)
| Tool | Purpose |
|------|---------|
| `meta_exchange_token` | Short-lived to long-lived token (~60 days) |
| `meta_refresh_token` | Extend Instagram/Facebook or refresh Threads (`platform`) |
| `meta_debug_token` | Check validity and scopes |
| `meta_get_app_info` | App information |
| `meta_subscribe_webhook` | Subscribe to webhooks |
| `meta_get_webhook_subscriptions` | List subscriptions |

### Instagram — Publishing (6)
| Tool | Purpose |
|------|---------|
| `ig_publish_photo` | Photo post (alt_text support) |
| `ig_publish_video` | Video post |
| `ig_publish_carousel` | Carousel/album (2-10 items) |
| `ig_publish_reel` | Reel (alt_text support) |
| `ig_publish_story` | Story (24hr) |
| `ig_get_container_status` | Check processing status |

### Instagram — Media (5)
| Tool | Purpose |
|------|---------|
| `ig_get_media_list` / `ig_get_media` | List/get media |
| `ig_delete_media` | Delete a post |
| `ig_get_media_insights` | Analytics (views, reach, saved, shares) |
| `ig_toggle_comments` | Enable/disable comments |

### Instagram — Comments (7)
| Tool | Purpose |
|------|---------|
| `ig_get_comments` / `ig_get_comment` | Read comments |
| `ig_post_comment` / `ig_reply_to_comment` | Write comments |
| `ig_get_replies` | Reply threads |
| `ig_hide_comment` / `ig_delete_comment` | Moderate |

### Instagram — Profile & Insights (5)
| Tool | Purpose |
|------|---------|
| `ig_get_profile` | Profile info |
| `ig_get_account_insights` | Account analytics |
| `ig_business_discovery` | Look up other accounts |
| `ig_get_collaboration_invites` | Pending collabs |
| `ig_respond_collaboration_invite` | Accept/decline |

### Instagram — Hashtags (4)
| Tool | Purpose |
|------|---------|
| `ig_search_hashtag` / `ig_get_hashtag` | Search/info |
| `ig_get_hashtag_recent` / `ig_get_hashtag_top` | Hashtag feeds |

### Instagram — Mentions & Tags (2)
| Tool | Purpose |
|------|---------|
| `ig_get_mentioned_comments` | Mentions |
| `ig_get_tagged_media` | Tagged media |

### Instagram — Messaging (4)
| Tool | Purpose |
|------|---------|
| `ig_get_conversations` / `ig_get_messages` / `ig_get_message` | Read DMs |
| `ig_send_message` | Send DM |

### Threads — Publishing (7)
| Tool | Purpose |
|------|---------|
| `threads_publish_text` | Text post (polls, GIFs, links, topics, quotes, spoiler, ghost posts, reply approvals, location, IG Stories cross-share) |
| `threads_publish_image` / `threads_publish_video` | Media posts (reply approvals, location, IG Stories cross-share) |
| `threads_publish_carousel` | Carousel (2-20 items, reply approvals, location, IG Stories cross-share) |
| `threads_delete_post` | Delete (max 100/day) |
| `threads_get_container_status` | Processing status |
| `threads_get_publishing_limit` | Quota check (250/day) |

### Threads — Media & Search (4)
| Tool | Purpose |
|------|---------|
| `threads_get_posts` / `threads_get_post` | List/get posts |
| `threads_get_profile_posts` | List a public profile's posts by username |
| `threads_search_posts` | Search `/keyword_search` by keyword or topic tag |

### Threads — Replies (7)
| Tool | Purpose |
|------|---------|
| `threads_get_replies` | Get top-level replies |
| `threads_get_conversation` | Get all replies, flattened |
| `threads_reply` | Reply (image/video support) |
| `threads_hide_reply` / `threads_unhide_reply` | Moderate |
| `threads_get_pending_replies` / `threads_manage_pending_reply` | Reply approval queue |

### Threads — Profile, Mentions, Locations & oEmbed (7)
| Tool | Purpose |
|------|---------|
| `threads_get_profile` / `threads_get_user_threads` | Profile |
| `threads_lookup_profile` | Look up a public profile by username |
| `threads_get_mentions` | Posts where the user was @mentioned |
| `threads_search_locations` / `threads_get_location` | Location tagging |
| `threads_get_oembed` | Embed HTML for a public post |

### Threads — Insights (2)
| Tool | Purpose |
|------|---------|
| `threads_get_post_insights` | Post analytics |
| `threads_get_user_insights` | Account analytics |

## When to Use

Invoke meta MCP tools when the task involves:
- Publishing photos, videos, reels, stories, or carousels to Instagram
- Publishing text, image, video, or carousel posts to Threads
- Cross-posting content to both Instagram and Threads
- Viewing or replying to comments on Instagram or Threads
- Checking follower counts, reach, views, and other analytics
- Searching hashtags or public Threads posts
- Managing Instagram DMs
- Moderating comments and replies (hide/delete)
- Managing Meta API tokens (exchange, refresh, debug)

## Safety Rules

- **Never post content without explicit user confirmation** — always show a draft first
- Instagram requires a Business or Creator account; Threads works with any account
- Media publishing is async: always check container status before assuming success
- Threads limit: 250 posts/day, 100 deletes/day — check `threads_get_publishing_limit` before bulk ops
- Tokens expire after ~60 days — use `meta_debug_token` to check and `meta_refresh_token` with the correct `platform` to renew
- Only set env vars for platforms you actually use

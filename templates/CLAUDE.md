# Meta MCP — Instructions for Claude

This project uses the **meta-mcp** MCP server for Instagram Graph API, Threads API, and Meta platform management.

## Available MCP Tools

All tools are prefixed with `mcp__meta__` in Claude Code.

### Meta Platform
- `meta_exchange_token` — Exchange short-lived token for long-lived (~60 days)
- `meta_refresh_token` — Extend an Instagram/Facebook token or refresh a Threads token (`platform` selects the flow)
- `meta_debug_token` — Inspect token validity and scopes
- `meta_get_app_info` — Get Meta App information
- `meta_subscribe_webhook` / `meta_get_webhook_subscriptions` — Webhook management

### Instagram — Publishing
- `ig_publish_photo` — Post a photo (supports alt_text)
- `ig_publish_video` — Post a video
- `ig_publish_carousel` — Post a carousel/album (2-10 items)
- `ig_publish_reel` — Post a Reel (supports alt_text)
- `ig_publish_story` — Post a Story (24hr)
- `ig_get_container_status` — Check media processing status

### Instagram — Media
- `ig_get_media_list` / `ig_get_media` — List/get media
- `ig_delete_media` — Delete a post
- `ig_get_media_insights` — Media analytics (views, reach, saved, shares)
- `ig_toggle_comments` — Enable/disable comments

### Instagram — Comments
- `ig_get_comments` / `ig_get_comment` — Read comments
- `ig_post_comment` / `ig_reply_to_comment` — Write comments
- `ig_get_replies` — Get reply threads
- `ig_hide_comment` / `ig_delete_comment` — Moderate comments

### Instagram — Profile & Insights
- `ig_get_profile` — Account profile info
- `ig_get_account_insights` — Account analytics (views, reach, follower_count)
- `ig_business_discovery` — Look up another business account
- `ig_get_collaboration_invites` / `ig_respond_collaboration_invite` — Collaboration invites

### Instagram — Hashtags
- `ig_search_hashtag` / `ig_get_hashtag` — Search and get hashtag info
- `ig_get_hashtag_recent` / `ig_get_hashtag_top` — Hashtag media feeds

### Instagram — Mentions & Tags
- `ig_get_mentioned_comments` — Comments mentioning you
- `ig_get_tagged_media` — Media you are tagged in

### Instagram — Messaging
- `ig_get_conversations` / `ig_get_messages` / `ig_get_message` — Read DMs
- `ig_send_message` — Send a DM

DM tools using Facebook Login require `INSTAGRAM_MESSAGING_ACCESS_TOKEN` (the linked Page access token) and `INSTAGRAM_PAGE_ID` in addition to the Instagram configuration.

### Threads — Publishing
- `threads_publish_text` — Text post (polls, GIFs, link attachments, topic tags, quotes, spoiler flag, ghost posts, reply approvals, location tag, IG Stories cross-share)
- `threads_publish_image` / `threads_publish_video` — Media posts (alt_text, topic tags, reply approvals, location tag, IG Stories cross-share)
- `threads_publish_carousel` — Carousel (2-20 items, reply approvals, location tag, IG Stories cross-share)
- `threads_delete_post` — Delete post (max 100/day)
- `threads_get_container_status` — Check processing status
- `threads_get_publishing_limit` — Check remaining quota (250/day)

### Threads — Media & Search
- `threads_get_posts` / `threads_get_post` — List/get posts
- `threads_get_profile_posts` — List a public profile's posts by username (Profile Discovery)
- `threads_search_posts` — Search `/keyword_search` by keyword or topic tag, filter by media type/author

### Threads — Replies
- `threads_get_replies` — Get top-level replies
- `threads_get_conversation` — Get all replies to a post, flattened (including nested)
- `threads_reply` — Reply (supports image/video)
- `threads_hide_reply` / `threads_unhide_reply` — Moderate replies
- `threads_get_pending_replies` / `threads_manage_pending_reply` — Reply approval queue (for posts with `enable_reply_approvals`)

### Threads — Profile, Mentions, Locations & oEmbed
- `threads_get_profile` / `threads_get_user_threads` — Profile info
- `threads_lookup_profile` — Look up a public profile by username (Profile Discovery)
- `threads_get_mentions` — Posts where the user was @mentioned
- `threads_search_locations` / `threads_get_location` — Search and retrieve locations to tag
- `threads_get_oembed` — Get embed HTML/metadata for a public post

### Threads — Insights
- `threads_get_post_insights` — Post analytics
- `threads_get_user_insights` — Account analytics

## When to Use

Use the meta MCP tools when the task involves:
- Publishing photos, videos, reels, stories, or carousels to Instagram
- Publishing text, image, video, or carousel posts to Threads
- Cross-posting content to both Instagram and Threads
- Viewing or replying to comments on Instagram or Threads
- Checking follower counts, reach, views, and other analytics
- Searching hashtags or public Threads posts
- Managing Instagram DMs
- Moderating comments and replies (hide/delete)
- Managing Meta API tokens (exchange, refresh, debug)

## Important Notes

- Instagram requires a **Business or Creator account** (free to switch).
- Threads works with **any account type**.
- Only set env vars for the platforms you actually use.
- Media publishing is async: use `ig_get_container_status` or `threads_get_container_status` to check processing before assuming success.
- Threads has a 250 posts/day limit — check with `threads_get_publishing_limit` before bulk operations.
- Access tokens expire after ~60 days. Use `meta_debug_token` to check and `meta_refresh_token` with the correct `platform` to renew.
- Use the `content_publish` prompt for cross-platform posting workflows.

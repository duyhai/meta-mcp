#!/bin/sh
# Launcher for the audited meta-mcp fork (tag audited-2026-09-16).
# Reads the never-expiring Page token from disk so it never lives in Claude config.
export INSTAGRAM_ACCESS_TOKEN="$(cat "$HOME/.config/meta-mcp/token")"
export INSTAGRAM_USER_ID="17841471826045110"
# Deliberately NOT set (security posture from the audit):
#   META_APP_ID / META_APP_SECRET  -> keeps meta_* auth/webhook tools inert
#   INSTAGRAM_MESSAGING_ACCESS_TOKEN / INSTAGRAM_PAGE_ID -> no DM access
#   THREADS_ACCESS_TOKEN / THREADS_USER_ID -> Threads not in use
exec node "$(dirname "$0")/dist/index.js"

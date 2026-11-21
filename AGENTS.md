<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules

- Tools live in `public.tools`: `kind = static` is a group whose children point to it via `parent_id`; `kind = dynamic` runs one endpoint. Keep this two-level shape so the home grid and group pages stay simple.
- Tools run through the `/api/run` server route, which builds the upstream request with `buildUpstreamRequest` in `src/lib/tool-request.ts`; browsers never call tool endpoints directly (avoids CORS and keeps secret headers server-side).
- API keys for tools go in `public.tool_secrets` (admin-only RLS), never in `tools`, because `tools` is publicly readable.
- Auth is username + password: usernames map to synthetic emails via `src/lib/username.ts`, auto-confirm is on, and email-based password reset is not available.
- Roles live in `public.user_roles`; the signup trigger grants `admin` only to the first account, and the UI hides registration once `admin_exists()` is true.
- Tool icons are stored as Lucide icon names and rendered through `DynamicIcon`, which accepts PascalCase or kebab-case.
- Home banner videos live in the private `banners` storage bucket (workspace blocks public buckets) with rows in `public.banners`; visitors play them through signed links created in `src/lib/banners-data.ts`.
- The intro loader, `InfinityMark` and the tool-run loader (`ToolLoading`) carry `data-keep-motion` so the global reduced-motion rule does not freeze them.
- The site background image lives in the private `site-assets` bucket, referenced by the single-row `public.site_settings` (id = 1); `SiteBackground` in `__root` shows it through a signed link from `src/lib/site-settings.ts`.
- Visitors never see raw JSON or endpoint/method details: tool responses render through `ToolResult`, which uses the pure helpers in `src/lib/result-format.ts` (envelope unwrapping, Indonesian labels, plain-text copy).
- The UI is liquid glass: surfaces use the `glass` / `glass-panel` / `glass-inset` / `glass-field` utilities in `src/styles.css` over the `SiteBackground` backdrop (ambient blobs + optional admin image), so restyle through those utilities rather than solid fills.
- Entrance animations use `backwards` fill, never `both`/`forwards` on opacity, because a held opacity animation on an ancestor stops `backdrop-filter` blur inside it.

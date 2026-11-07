# AxoZap Games

One Cloudflare Pages frontend and one Hono Worker API for Geometry Dash demons and Celeste golden strawberries. Both games use the existing `axozap-games` D1 database.

| Page | Path |
| --- | --- |
| Game selection | `/` |
| Geometry Dash | `/gd` |
| Celeste | `/celeste` |
| Admin selection | `/admin` |
| Geometry Dash admin | `/gd/admin` |
| Celeste admin | `/celeste/admin` |

The frontend calls the single Worker at `axozap-games-backend.peteystillwell.workers.dev`. Its endpoints are under `/api/gd` and `/api/celeste`. Set `VITE_API_ORIGIN` in Pages if you later give the Worker its own domain.

## Development

```sh
npm install
npm run typegen
npx wrangler d1 execute axozap-games --local --file worker/migrations/0001_create_games.sql
npx wrangler d1 execute axozap-games --local --file worker/migrations/0002_hide_celeste_groups.sql
npm run dev:worker
```

In another terminal, run `npm run dev`. Vite proxies `/api` to the local Worker on port 8787. Local D1 starts empty; the deployed Worker uses the populated remote database.

## Deployment

The `axozap-games` Cloudflare Pages project is connected to this repository's `main` branch. Its configured build command is `npm run build` and its output directory is `build`. Pushes to `main` deploy the frontend at `games.axozap.com`.

Deploy the API with `npm run deploy` after authenticating Wrangler. The Worker binding already points to the populated `axozap-games` D1 database. Keep the two old Workers in place until the new site is verified; this project does not change them.

Before deploying a Worker that uses group visibility, apply `worker/migrations/0002_hide_celeste_groups.sql` to the existing remote database with `npx wrangler d1 execute axozap-games --remote --file worker/migrations/0002_hide_celeste_groups.sql`.

The `CF_ACCESS_AUD` in `wrangler.jsonc` is the audience of the Access application currently guarding `/gd/admin` and `/celeste/admin` on `games.axozap.com`. If you replace that application, update the audience and redeploy the Worker. The API validates the Access JWT on every admin write and before returning hidden entries. Separate apps can use optional `CF_ACCESS_AUD_GD` and `CF_ACCESS_AUD_CELESTE` bindings.

Geometry Dash's optional Google Sheets append uses `GOOGLE_SERVICE_ACCOUNT`, `GOOGLE_SHEET_ID`, and `GOOGLE_SHEET_NAME`.

## Personal demon ratings

**My tier** (positive whole number) and **My enjoyment** (0–10, decimals allowed) are optional ratings stored in D1. Add/edit them in the website's admin forms or the Geode mod's submission popup. Blank values mean unrated; clearing a website field removes that rating. Both classic and platformer demons support personal ratings; the website forms require no level ID. Legacy clients that omit these fields preserve existing ratings when editing.

GDDL's final community and personal statistics are archived in `gd_gddl_snapshots`. Existing personal submissions seed the local ratings; subsequent edits are independent. The website shows the saved community tier/enjoyment as a reference. It has no live GDDL pull button or API endpoint and makes no requests to GDDL. New levels can be rated locally without a GDDL record.

Before deploying the Worker, apply `worker/migrations/0003_demon_ratings.sql` to the remote database, then finish the one-time GDDL snapshot import before removing the old endpoint. The final snapshot was requested on 2026-11-07. Missing GDDL matches stay blank. Platformer GDDL difficulty tiers are left blank; available enjoyment scores are preserved.

Run `npm run test:ratings` for local D1/API checks, and `npm run build` for frontend and Worker type checks. The updated Windows mod is built from `GD/` and packaged at `GD/build-win/axozap.demon_list_sync.geode`.

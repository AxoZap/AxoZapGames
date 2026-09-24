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
npm run dev:worker
```

In another terminal, run `npm run dev`. Vite proxies `/api` to the local Worker on port 8787. Local D1 starts empty; the deployed Worker uses the populated remote database.

## Deployment

The `axozap-games` Cloudflare Pages project is connected to this repository's `main` branch. Its configured build command is `npm run build` and its output directory is `build`. Pushes to `main` deploy the frontend at `games.axozap.com`.

Deploy the API with `npm run deploy` after authenticating Wrangler. The Worker binding already points to the populated `axozap-games` D1 database. Keep the two old Workers in place until the new site is verified; this project does not change them.

The `CF_ACCESS_AUD` in `wrangler.jsonc` is the audience of the Access application currently guarding `/gd/admin` and `/celeste/admin` on `games.axozap.com`. If you replace that application, update the audience and redeploy the Worker. The API validates the Access JWT on every admin write and before returning hidden entries. Separate apps can use optional `CF_ACCESS_AUD_GD` and `CF_ACCESS_AUD_CELESTE` bindings.

Optional Geometry Dash integrations need their secrets or variables configured on the new Worker: `GDDL_API_TOKEN`, `GOOGLE_SERVICE_ACCOUNT`, `GOOGLE_SHEET_ID`, and `GOOGLE_SHEET_NAME`. The public GDDL lookup and both game lists work without these; personal GDDL ratings and Google Sheets append require them.

import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { GoogleAuth } from "google-auth-library";

type Bindings = {
	axozap_games: D1Database;
	CF_ACCESS_TEAM_DOMAIN?: string; // e.g. "https://axozap.cloudflareaccess.com"
	CF_ACCESS_AUD?: string;          // Shared Access application audience
	CF_ACCESS_AUD_GD?: string;       // Optional Geometry Dash Access audience
	CF_ACCESS_AUD_CELESTE?: string;  // Optional Celeste Access audience
	GOOGLE_SERVICE_ACCOUNT?: string;
	GOOGLE_SHEET_ID?: string;
	GOOGLE_SHEET_NAME?: string;
	GDDL_API_TOKEN?: string;
};

type Demon = {
	id?: string;
	name: string;
	difficulty: string;
	rating?: string;
	gauntlet?: boolean;
	weekly?: boolean;
	event?: boolean;
	hidden?: boolean;
	attempts?: number;
	videoUrl?: string;
	levelId?: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use("*", logger(console.log));
app.use(
	"/*",
	cors({
		origin: "*",
		allowHeaders: ["Content-Type", "Authorization", "cf-access-jwt-assertion"],
		allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
		exposeHeaders: ["Content-Length"],
		maxAge: 600,
	})
);

// Validate a Cloudflare Access JWT properly using the team's public JWKS.
// Returns true only if the token is signed by Cloudflare and the AUD matches.
async function isAuthorized(c: any, game: "gd" | "celeste"): Promise<boolean> {
	const teamDomain = c.env.CF_ACCESS_TEAM_DOMAIN;
	const aud = (game === "gd" ? c.env.CF_ACCESS_AUD_GD : c.env.CF_ACCESS_AUD_CELESTE) || c.env.CF_ACCESS_AUD;

	// Both secrets must be configured – fail closed if missing
	if (!teamDomain || !aud) {
		console.error("CF_ACCESS_TEAM_DOMAIN or CF_ACCESS_AUD not configured");
		return false;
	}

	const token =
	c.req.header("cf-access-jwt-assertion") || // passed by frontend JS
	c.req.header("Cf-Access-Jwt-Assertion");   // injected by CF Access proxy

	if (!token) return false;

	try {
		// Fetch Cloudflare's public key set for this team
		const jwksUrl = `${teamDomain}/cdn-cgi/access/certs`;
		const jwksRes = await fetch(jwksUrl, { cf: { cacheEverything: true, cacheTtl: 3600 } } as any);
		if (!jwksRes.ok) {
			console.error("Failed to fetch JWKS:", jwksRes.status);
			return false;
		}
		const { keys } = (await jwksRes.json()) as { keys: JsonWebKey[] };

		// Try each key until one verifies
		for (const jwk of keys) {
			try {
				const cryptoKey = await crypto.subtle.importKey(
					"jwk",
					jwk,
					{ name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
					false,
					["verify"]
				);

				// Decode and verify the JWT
				const parts = token.split(".");
				if (parts.length !== 3) continue;

				const [headerB64, payloadB64, sigB64] = parts;
				const signingInput = new TextEncoder().encode(`${headerB64}.${payloadB64}`);

				// Convert base64url signature to ArrayBuffer
				const sigBytes = Uint8Array.from(
					atob(sigB64.replace(/-/g, "+").replace(/_/g, "/")),
												 (c) => c.charCodeAt(0)
				);

				const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", cryptoKey, sigBytes, signingInput);
				if (!valid) continue;

				// Verify payload claims
				const payload = JSON.parse(atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/")));
				const now = Math.floor(Date.now() / 1000);

				if (payload.exp && payload.exp < now) return false;   // expired
				if (payload.nbf && payload.nbf > now) return false;   // not yet valid
				if (!(Array.isArray(payload.aud) ? payload.aud.includes(aud) : payload.aud === aud)) return false;         // wrong app

				return true;
			} catch {
				// Key didn't work, try next
			}
		}
		return false;
	} catch (err) {
		console.error("JWT validation error:", err);
		return false;
	}
}

// Keep the API's string IDs and booleans while storing typed columns in D1.
async function getDemons(db: D1Database): Promise<Demon[]> {
	const { results } = await db.prepare('SELECT * FROM "Geometry Dash" ORDER BY id').all();
	return results.map((row: any) => ({
		id: String(row.id),
		name: row.name,
		difficulty: row.difficulty,
		rating: row.rating,
		gauntlet: Boolean(row.gauntlet),
		weekly: Boolean(row.weekly),
		event: Boolean(row.event),
		...(row.hidden != null ? { hidden: Boolean(row.hidden) } : {}),
		...(row.attempts != null ? { attempts: Number(row.attempts) } : {}),
		...(row.video_url != null ? { videoUrl: row.video_url } : {}),
		...(row.level_id != null ? { levelId: row.level_id } : {}),
	}));
}

async function saveDemon(db: D1Database, demon: Demon & { id: string }): Promise<void> {
	await db.prepare(`
		INSERT INTO "Geometry Dash"
		(id, name, difficulty, rating, gauntlet, weekly, event, hidden, attempts, video_url, level_id)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(id) DO UPDATE SET
		name = excluded.name, difficulty = excluded.difficulty, rating = excluded.rating,
		gauntlet = excluded.gauntlet, weekly = excluded.weekly, event = excluded.event,
		hidden = excluded.hidden, attempts = excluded.attempts,
		video_url = excluded.video_url, level_id = excluded.level_id
	`).bind(
		Number(demon.id), demon.name, demon.difficulty, demon.rating ?? null,
		Number(Boolean(demon.gauntlet)), Number(Boolean(demon.weekly)), Number(Boolean(demon.event)),
		demon.hidden == null ? null : Number(Boolean(demon.hidden)), demon.attempts ?? null,
		demon.videoUrl ?? null, demon.levelId ?? null
	).run();
}

// Google Sheets Sync Helpers
async function getGoogleAccessToken(serviceAccountJson?: string): Promise<string> {
	if (!serviceAccountJson) throw new Error("GOOGLE_SERVICE_ACCOUNT variable not set");
	const creds = JSON.parse(serviceAccountJson.trim());
	const auth = new GoogleAuth({
		credentials: {
			client_email: creds.client_email,
			private_key: creds.private_key,
		},
		scopes: ["https://www.googleapis.com/auth/spreadsheets"],
	});
	const client = await auth.getClient();
	const token = await client.getAccessToken();
	if (!token.token) throw new Error("Failed to get Google Access Token");
	return token.token;
}

async function appendDemonToSheet(env: Bindings, demon: Demon) {
	try {
		const sheetId = env.GOOGLE_SHEET_ID;
		const sheetName = env.GOOGLE_SHEET_NAME;
		if (!sheetId || !sheetName) return;

		const token = await getGoogleAccessToken(env.GOOGLE_SERVICE_ACCOUNT);
		const readUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(sheetName)}!A:A`;
		const readRes = await fetch(readUrl, { headers: { Authorization: `Bearer ${token}` } });

		let nextRow = 2;
		if (readRes.ok) {
			const readData = (await readRes.json()) as any;
			if (readData.values && readData.values.length > 0) {
				nextRow = readData.values.length + 1;
			}
		}

		const row = [
			demon.name,
			demon.difficulty,
			demon.rating || "",
			demon.gauntlet ? "TRUE" : "FALSE",
			demon.weekly ? "TRUE" : "FALSE",
			demon.event ? "TRUE" : "FALSE",
			demon.attempts?.toString() || "",
		];

		const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(sheetName)}!A${nextRow}:G${nextRow}?valueInputOption=USER_ENTERED`;
		await fetch(updateUrl, {
			method: "PUT",
			headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
			body: JSON.stringify({ values: [row] }),
		});
	} catch (err) {
		console.error("Sheets Append Error:", err);
	}
}

// Routes
app.get("/api/health", (c) => c.json({ status: "ok" }));

app.get("/api/gd/demons", async (c) => {
	const sorted = await getDemons(c.env.axozap_games);

	const admin = await isAuthorized(c, "gd");
	if (admin) {
		return c.json(sorted);
	}

	// Public: hidden demons are completely invisible — removed from the list.
	// IDs are reassigned sequentially so there are no gaps that reveal hidden entries.
	const visible = sorted.filter((d: Demon) => !d.hidden);
	const sanitized = visible.map((d: Demon, i: number) => ({ ...d, id: String(i + 1) }));
	return c.json(sanitized);
});

app.post("/api/gd/demons", async (c) => {
	if (!await isAuthorized(c, "gd")) return c.json({ error: "Unauthorized" }, 401);
	const body = await c.req.json();
	const demon = body.demon;

	// Fetch existing demons to compute the next sequential integer ID
	const maxRow = await c.env.axozap_games.prepare('SELECT COALESCE(MAX(id), 0) AS max_id FROM "Geometry Dash"').first<{ max_id: number }>();
	const nextId = String((maxRow?.max_id ?? 0) + 1);

	const demonWithId = { ...demon, id: nextId };
	await saveDemon(c.env.axozap_games, demonWithId);

	c.executionCtx.waitUntil(appendDemonToSheet(c.env, demonWithId));

	return c.json(demonWithId);
});

app.put("/api/gd/demons/:id", async (c) => {
	if (!await isAuthorized(c, "gd")) return c.json({ error: "Unauthorized" }, 401);
	const id = c.req.param("id");
	const body = await c.req.json();
	const demon = body.demon;

	const demonWithId = { ...demon, id };
	await saveDemon(c.env.axozap_games, demonWithId);
	return c.json(demonWithId);
});

app.delete("/api/gd/demons/:id", async (c) => {
	if (!await isAuthorized(c, "gd")) return c.json({ error: "Unauthorized" }, 401);
	const id = c.req.param("id");
	await c.env.axozap_games.prepare('DELETE FROM "Geometry Dash" WHERE id = ?').bind(Number(id)).run();
	return c.json({ success: true });
});

// GDDL Integration
let cachedGddlUserId: string | number | null = null;

app.get("/api/gd/gddl/:levelId", async (c) => {
	const levelId = c.req.param("levelId");
	if (!levelId || isNaN(Number(levelId))) {
		return c.json({ error: "Invalid level ID" }, 400);
	}

	try {
		// Access environment secret from Cloudflare context (c.env)
		const GDDL_API_TOKEN = c.env.GDDL_API_TOKEN || "";

		const headers: Record<string, string> = {
			"Content-Type": "application/json",
			"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AxoZapDemonsList/1.0",
		};

		if (GDDL_API_TOKEN) {
			headers["Authorization"] = GDDL_API_TOKEN.startsWith("Bearer ")
			? GDDL_API_TOKEN
			: `Bearer ${GDDL_API_TOKEN}`;
		}

		// 1. Fetch public level info
		const levelRes = await fetch(`https://gdladder.com/api/levels/${levelId}`, { headers });

		let tier: number | null = null;
		let avgEnjoyment: number | null = null;
		let myTier: number | null = null;
		let enjoyment: number | null = null;

		if (levelRes.ok) {
			try {
				const d = (await levelRes.json()) as any;
				tier = d.Rating ?? d.rating ?? null;
				avgEnjoyment = d.Enjoyment ?? d.enjoyment ?? null;
			} catch (e) {
				console.error(`⚠️ Level ${levelId} response was not valid JSON`);
			}
		}

		// 2. Fetch user's personal rating for this exact level
		if (GDDL_API_TOKEN) {
			// Step A: Dynamically resolve User ID if not already cached
			if (!cachedGddlUserId) {
				try {
					const meRes = await fetch("https://gdladder.com/api/user/me", { headers });
					if (meRes.ok) {
						const meData = (await meRes.json()) as any;
						cachedGddlUserId = meData.ID ?? meData.id ?? meData.userID ?? null;
						console.log("👤 Resolved GDDL User ID from /api/user/me:", cachedGddlUserId);
					} else {
						console.error(`⚠️ /api/user/me failed [HTTP ${meRes.status}]`);
					}
				} catch (err) {
					console.error("⚠️ Error calling /api/user/me:", err);
				}
			}

			// Step B: Direct lookup for this level ID
			if (cachedGddlUserId) {
				const subRes = await fetch(
					`https://gdladder.com/api/user/${cachedGddlUserId}/submissions/${levelId}`,
					{ headers }
				);

				if (subRes.ok) {
					try {
						const match = (await subRes.json()) as any;
						myTier = match.Rating ?? match.rating ?? match.Tier ?? match.tier ?? null;
						enjoyment = match.Enjoyment ?? match.enjoyment ?? null;
					} catch (e) {
						console.error(`⚠️ Failed to parse submission JSON for level ${levelId}`);
					}
				} else if (subRes.status === 404) {
					console.log(`ℹ️ Level ${levelId} has no rating submission by user ${cachedGddlUserId}`);
				} else {
					console.error(`⚠️ Fetching level submission failed with HTTP ${subRes.status}`);
				}
			}
		}

		return c.json({ tier, avgEnjoyment, myTier, enjoyment });
	} catch (error) {
		console.error("❌ Exception in GDDL handler:", error);
		return c.json({ error: "Failed to fetch GDDL data" }, 500);
	}
});

export type Gold = {
  id?: number | string;
  placement?: number;
  name: string;
  difficulty: string;
  date: string;
  attempts?: number | null;
  clip?: string | null;
  hidden?: boolean | number;
  group_name?: string | null;
  completed?: boolean | number;
  created_at?: string;
};

export type LevelGroup = {
  id?: number | string;
  placement?: number;
  name: string;
  description?: string | null;
  date?: string | null;
  url?: string | null;
  attempts?: number | null;
  created_at?: string;
};


function formatGold(row: any): Gold {
  return {
    id: row.id,
    placement: row.placement != null ? Number(row.placement) : Number(row.id),
    name: row.name,
    difficulty: row.difficulty,
    date: row.date != null ? String(row.date) : "",
    attempts: row.attempts != null && row.attempts !== "" ? Number(row.attempts) : null,
    clip: row.clip || null,
    hidden: Boolean(row.hidden),
    group_name: row.group_name ? String(row.group_name).trim() : null,
    completed: row.completed === 0 || row.completed === false ? false : true,
    created_at: row.created_at,
  };
}

function formatGroup(row: any): LevelGroup {
  return {
    id: row.id,
    placement: row.placement != null ? Number(row.placement) : Number(row.id),
    name: row.name,
    description: row.description || null,
    date: row.date || null,
    url: row.url || null,
    attempts: row.attempts != null && row.attempts !== "" ? Number(row.attempts) : null,
    created_at: row.created_at,
  };
}

// GET golds
async function handleGetGolds(c: any) {
  const admin = await isAuthorized(c, "celeste");
  const db = c.env.axozap_games;

  let query = "SELECT * FROM \"Celeste\" ORDER BY placement ASC, id ASC";
  if (!admin) {
    query = "SELECT * FROM \"Celeste\" WHERE hidden = 0 ORDER BY placement ASC, id ASC";
  }

  const { results } = await db.prepare(query).all();
  const list = (results || []).map(formatGold);

  return c.json(list);
}

app.get("/api/celeste/golds", handleGetGolds);

// POST gold (Admin only)
async function handlePostGold(c: any) {
  if (!(await isAuthorized(c, "celeste"))) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const body = await c.req.json();
  const gold = body.gold || body;
  const db = c.env.axozap_games;

  let placement = gold.placement;
  if (placement == null) {
    const maxRow: any = await db
      .prepare("SELECT COALESCE(MAX(placement), 0) AS maxP FROM \"Celeste\"")
      .first();
    placement = (maxRow?.maxP || 0) + 1;
  }

  const name = String(gold.name || "").trim();
  const difficulty = String(gold.difficulty || "Easy").trim();
  const date = String(gold.date || "Initial").trim() || "Initial";
  const attempts =
    gold.attempts !== undefined && gold.attempts !== null && gold.attempts !== ""
      ? Number(gold.attempts)
      : null;
  const clip = gold.clip ? String(gold.clip).trim() : null;
  const hidden = gold.hidden ? 1 : 0;
  const group_name = gold.group_name && String(gold.group_name).trim() ? String(gold.group_name).trim() : null;
  const completed = gold.completed === false || gold.completed === 0 ? 0 : 1;

  const result = await db
    .prepare(
      "INSERT INTO \"Celeste\" (placement, name, difficulty, date, attempts, clip, hidden, group_name, completed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(placement, name, difficulty, date, attempts, clip, hidden, group_name, completed)
    .run();

  const newId = result.meta?.last_row_id;
  const created: any = await db
    .prepare("SELECT * FROM \"Celeste\" WHERE id = ?")
    .bind(newId)
    .first();

  return c.json(formatGold(created || { id: newId, placement, name, difficulty, date, attempts, clip, hidden, group_name, completed }), 201);
}

app.post("/api/celeste/golds", handlePostGold);

// PUT gold (Admin only)
async function handlePutGold(c: any) {
  if (!(await isAuthorized(c, "celeste"))) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const id = Number(c.req.param("id"));
  const body = await c.req.json();
  const gold = body.gold || body;
  const db = c.env.axozap_games;

  const name = String(gold.name || "").trim();
  const difficulty = String(gold.difficulty || "Easy").trim();
  const date = String(gold.date || "Initial").trim() || "Initial";
  const attempts =
    gold.attempts !== undefined && gold.attempts !== null && gold.attempts !== ""
      ? Number(gold.attempts)
      : null;
  const clip = gold.clip ? String(gold.clip).trim() : null;
  const hidden = gold.hidden ? 1 : 0;
  const placement = gold.placement != null ? Number(gold.placement) : null;
  const group_name = gold.group_name && String(gold.group_name).trim() ? String(gold.group_name).trim() : null;
  const completed = gold.completed === false || gold.completed === 0 ? 0 : 1;

  if (placement != null) {
    await db
      .prepare(
        "UPDATE \"Celeste\" SET placement = ?, name = ?, difficulty = ?, date = ?, attempts = ?, clip = ?, hidden = ?, group_name = ?, completed = ? WHERE id = ?"
      )
      .bind(placement, name, difficulty, date, attempts, clip, hidden, group_name, completed, id)
      .run();
  } else {
    await db
      .prepare(
        "UPDATE \"Celeste\" SET name = ?, difficulty = ?, date = ?, attempts = ?, clip = ?, hidden = ?, group_name = ?, completed = ? WHERE id = ?"
      )
      .bind(name, difficulty, date, attempts, clip, hidden, group_name, completed, id)
      .run();
  }

  const updated: any = await db
    .prepare("SELECT * FROM \"Celeste\" WHERE id = ?")
    .bind(id)
    .first();

  return c.json(formatGold(updated));
}

app.put("/api/celeste/golds/:id", handlePutGold);

// DELETE gold (Admin only)
async function handleDeleteGold(c: any) {
  if (!(await isAuthorized(c, "celeste"))) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const id = Number(c.req.param("id"));
  const db = c.env.axozap_games;

  await db.prepare("DELETE FROM \"Celeste\" WHERE id = ?").bind(id).run();
  return c.json({ success: true, id });
}

app.delete("/api/celeste/golds/:id", handleDeleteGold);

// GET /groups
async function handleGetGroups(c: any) {
  const db = c.env.axozap_games;
  const { results } = await db.prepare("SELECT * FROM \"Celeste Groups\" ORDER BY placement ASC, id ASC").all();
  return c.json((results || []).map(formatGroup));
}
app.get("/api/celeste/groups", handleGetGroups);

// POST /reorder (Admin only) - update placements for golds and/or groups in batch
async function handleReorder(c: any) {
  if (!(await isAuthorized(c, "celeste"))) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const body = await c.req.json();
  const db = c.env.axozap_games;

  // { goldOrders: [{ id: 1, placement: 1 }, ...], groupOrders: [{ id: 2, placement: 1 }, ...] }
  const goldOrders: Array<{ id: number | string; placement: number }> = body.goldOrders || [];
  const groupOrders: Array<{ id: number | string; placement: number }> = body.groupOrders || [];

  const statements: any[] = [];

  for (const item of goldOrders) {
    statements.push(
      db.prepare("UPDATE \"Celeste\" SET placement = ? WHERE id = ?").bind(Number(item.placement), Number(item.id))
    );
  }

  for (const item of groupOrders) {
    statements.push(
      db.prepare("UPDATE \"Celeste Groups\" SET placement = ? WHERE id = ?").bind(Number(item.placement), Number(item.id))
    );
  }

  if (statements.length > 0) {
    await db.batch(statements);
  }

  return c.json({ success: true });
}
app.post("/api/celeste/reorder", handleReorder);

// POST /groups (Admin only)
async function handlePostGroup(c: any) {
  if (!(await isAuthorized(c, "celeste"))) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const body = await c.req.json();
  const group = body.group || body;
  const db = c.env.axozap_games;

  const name = String(group.name || "").trim();
  if (!name) {
    return c.json({ error: "Group name is required" }, 400);
  }

  const description = group.description ? String(group.description).trim() : null;
  const date = group.date ? String(group.date).trim() : null;
  const url = group.url ? String(group.url).trim() : null;
  const attempts =
    group.attempts !== undefined && group.attempts !== null && group.attempts !== ""
      ? Number(group.attempts)
      : null;

  try {
    const result = await db
      .prepare(
        "INSERT INTO \"Celeste Groups\" (name, description, date, url, attempts) VALUES (?, ?, ?, ?, ?)"
      )
      .bind(name, description, date, url, attempts)
      .run();

    const newId = result.meta?.last_row_id;
    const created: any = await db
      .prepare("SELECT * FROM \"Celeste Groups\" WHERE id = ?")
      .bind(newId)
      .first();

    return c.json(formatGroup(created || { id: newId, name, description, date, url, attempts }), 201);
  } catch (err: any) {
    return c.json({ error: err.message || "Failed to create group" }, 400);
  }
}
app.post("/api/celeste/groups", handlePostGroup);

// PUT /groups/:id (Admin only) - Also cascades name updates to golds.group_name
async function handlePutGroup(c: any) {
  if (!(await isAuthorized(c, "celeste"))) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const id = Number(c.req.param("id"));
  const body = await c.req.json();
  const group = body.group || body;
  const db = c.env.axozap_games;

  const existing: any = await db
    .prepare("SELECT * FROM \"Celeste Groups\" WHERE id = ?")
    .bind(id)
    .first();

  if (!existing) {
    return c.json({ error: "Group not found" }, 404);
  }

  const oldName = existing.name;
  const newName = String(group.name || "").trim();
  if (!newName) {
    return c.json({ error: "Group name is required" }, 400);
  }

  const description = group.description ? String(group.description).trim() : null;
  const date = group.date ? String(group.date).trim() : null;
  const url = group.url ? String(group.url).trim() : null;
  const attempts =
    group.attempts !== undefined && group.attempts !== null && group.attempts !== ""
      ? Number(group.attempts)
      : null;

  try {
    await db
      .prepare(
        "UPDATE \"Celeste Groups\" SET name = ?, description = ?, date = ?, url = ?, attempts = ? WHERE id = ?"
      )
      .bind(newName, description, date, url, attempts, id)
      .run();

    // If group name changed, cascade to all gold levels in this group
    if (oldName !== newName) {
      await db
        .prepare("UPDATE \"Celeste\" SET group_name = ? WHERE group_name = ?")
        .bind(newName, oldName)
        .run();
    }

    const updated: any = await db
      .prepare("SELECT * FROM \"Celeste Groups\" WHERE id = ?")
      .bind(id)
      .first();

    return c.json(formatGroup(updated));
  } catch (err: any) {
    return c.json({ error: err.message || "Failed to update group" }, 400);
  }
}
app.put("/api/celeste/groups/:id", handlePutGroup);

// DELETE /groups/:id (Admin only)
async function handleDeleteGroup(c: any) {
  if (!(await isAuthorized(c, "celeste"))) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const id = Number(c.req.param("id"));
  const db = c.env.axozap_games;

  const existing: any = await db
    .prepare("SELECT * FROM \"Celeste Groups\" WHERE id = ?")
    .bind(id)
    .first();

  if (existing) {
    // Ungroup levels belonging to this group
    await db
      .prepare("UPDATE \"Celeste\" SET group_name = NULL WHERE group_name = ?")
      .bind(existing.name)
      .run();

    await db.prepare("DELETE FROM \"Celeste Groups\" WHERE id = ?").bind(id).run();
  }

  return c.json({ success: true, id });
}
app.delete("/api/celeste/groups/:id", handleDeleteGroup);


export default app;

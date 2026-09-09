import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { GoogleAuth } from "google-auth-library";

type Bindings = {
	axozap_db: D1Database;
	CF_ACCESS_TEAM_DOMAIN?: string; // e.g. "https://axozap.cloudflareaccess.com"
	CF_ACCESS_AUD?: string;          // Application Audience (AUD) tag from Cloudflare Access
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
async function isAuthorized(c: any): Promise<boolean> {
	const teamDomain = c.env.CF_ACCESS_TEAM_DOMAIN;
	const aud = c.env.CF_ACCESS_AUD;

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
				if (!payload.aud?.includes(aud)) return false;         // wrong app

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

// Helper DB functions for D1
async function dbGetByPrefix(db: D1Database, prefix: string): Promise<any[]> {
	const { results } = await db
		.prepare("SELECT value FROM kv_store WHERE key LIKE ?")
		.bind(prefix + "%")
		.all();
	return results.map((row: any) => JSON.parse(row.value));
}

async function dbSet(db: D1Database, key: string, value: any): Promise<void> {
	const valStr = JSON.stringify(value);
	await db
		.prepare("INSERT INTO kv_store (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?")
		.bind(key, valStr, valStr)
		.run();
}

async function dbDel(db: D1Database, key: string): Promise<void> {
	await db.prepare("DELETE FROM kv_store WHERE key = ?").bind(key).run();
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
app.get("/make-server-7e6e6986/health", (c) => c.json({ status: "ok" }));

app.get("/make-server-7e6e6986/demons", async (c) => {
	const demons = await dbGetByPrefix(c.env.axozap_db, "demon:");
	const sorted = demons.sort((a, b) => parseInt(a.id) - parseInt(b.id));

	const admin = await isAuthorized(c);
	if (admin) {
		return c.json(sorted);
	}

	// Public: hidden demons are completely invisible — removed from the list.
	// IDs are reassigned sequentially so there are no gaps that reveal hidden entries.
	const visible = sorted.filter((d: Demon) => !d.hidden);
	const sanitized = visible.map((d: Demon, i: number) => ({ ...d, id: String(i + 1) }));
	return c.json(sanitized);
});

app.post("/make-server-7e6e6986/demons", async (c) => {
	if (!await isAuthorized(c)) return c.json({ error: "Unauthorized" }, 401);
	const body = await c.req.json();
	const demon = body.demon;

	// Fetch existing demons to compute the next sequential integer ID
	const existingDemons = await dbGetByPrefix(c.env.axozap_db, "demon:");
	let maxId = 0;
	for (const d of existingDemons) {
		const numId = parseInt(d.id, 10);
		if (!isNaN(numId) && numId > maxId) {
			maxId = numId;
		}
	}
	const nextId = (maxId + 1).toString();

	const demonWithId = { ...demon, id: nextId };
	await dbSet(c.env.axozap_db, `demon:${nextId}`, demonWithId);

	c.executionCtx.waitUntil(appendDemonToSheet(c.env, demonWithId));

	return c.json(demonWithId);
});

app.put("/make-server-7e6e6986/demons/:id", async (c) => {
	if (!await isAuthorized(c)) return c.json({ error: "Unauthorized" }, 401);
	const id = c.req.param("id");
	const body = await c.req.json();
	const demon = body.demon;

	const demonWithId = { ...demon, id };
	await dbSet(c.env.axozap_db, `demon:${id}`, demonWithId);
	return c.json(demonWithId);
});

app.delete("/make-server-7e6e6986/demons/:id", async (c) => {
	if (!await isAuthorized(c)) return c.json({ error: "Unauthorized" }, 401);
	const id = c.req.param("id");
	await dbDel(c.env.axozap_db, `demon:${id}`);
	return c.json({ success: true });
});

// GDDL Integration
let cachedGddlUserId: string | number | null = null;

app.get("/make-server-7e6e6986/gddl/:levelId", async (c) => {
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

// ── Project55 ──────────────────────────────────────────────────────────────
// The transformation from raw admin value → visual fill is computed here
// so no client-side code reveals the curve shape.
// raw ∈ [0,100]  →  visual = (e^(raw/100) − 1) / (e − 1) × 100  ∈ [0,100]
function toVisual(raw: number): number {
	const clamped = Math.max(0, Math.min(100, raw));
	const normalized = (Math.exp(clamped / 100) - 1) / (Math.E - 1);
	return Math.pow(normalized, 1.5) * 100;
}

// Ensure all 10 rows exist (num 1-10 with Percent 0 if missing)
async function ensureExtraRows(db: D1Database): Promise<void> {
	for (let i = 1; i <= 10; i++) {
		await db
			.prepare("INSERT OR IGNORE INTO extra (num, Percent) VALUES (?, 0)")
			.bind(i)
			.run();
	}
}

// Public: returns visual fill values only (no raw data exposed)
app.get("/make-server-7e6e6986/project55", async (c) => {
	await ensureExtraRows(c.env.axozap_db);
	const { results } = await c.env.axozap_db
		.prepare("SELECT num, Percent FROM extra ORDER BY num ASC")
		.all<{ num: number; Percent: number }>();
	const bars = results.map((row) => ({
		num: row.num,
		fill: Math.round(toVisual(row.Percent)),
	}));
	return c.json(bars);
});

// Admin: returns raw stored values so the admin UI can display/edit them
app.get("/make-server-7e6e6986/project55/raw", async (c) => {
	if (!isAuthorized(c)) return c.json({ error: "Unauthorized" }, 401);
	await ensureExtraRows(c.env.axozap_db);
	const { results } = await c.env.axozap_db
		.prepare("SELECT num, Percent FROM extra ORDER BY num ASC")
		.all<{ num: number; Percent: number }>();
	return c.json(results);
});

// Admin: update a single bar's raw percent
app.put("/make-server-7e6e6986/project55/:num", async (c) => {
	if (!isAuthorized(c)) return c.json({ error: "Unauthorized" }, 401);
	const num = parseInt(c.req.param("num"), 10);
	if (isNaN(num) || num < 1 || num > 10)
		return c.json({ error: "Invalid bar number (1-10)" }, 400);
	const body = await c.req.json<{ percent: number }>();
	const percent = Math.max(0, Math.min(100, Math.round(body.percent)));
	await c.env.axozap_db
		.prepare("UPDATE extra SET Percent = ? WHERE num = ?")
		.bind(percent, num)
		.run();
	return c.json({ num, percent });
});

export default app;

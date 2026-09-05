import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { GoogleAuth } from "google-auth-library";

type Bindings = {
	axozap_db: D1Database;
	ADMIN_PASSWORD?: string;
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
		allowHeaders: ["Content-Type", "Authorization", "X-Admin-Request", "cf-access-authenticated-user-email", "cf-access-jwt-assertion"],
		allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
		exposeHeaders: ["Content-Length"],
		maxAge: 600,
	})
);

// Helper to check authorization (by password, Zero Trust header, or admin request)
function isAuthorized(c: any, password?: string): boolean {
	const adminPw = c.env.ADMIN_PASSWORD;
	if (adminPw && password === adminPw) return true;
	if (
		c.req.header("cf-access-authenticated-user-email") ||
		c.req.header("cf-access-jwt-assertion") ||
		c.req.header("X-Admin-Request") === "true"
	) {
		return true;
	}
	if (!adminPw) return true;
	return false;
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

app.post("/make-server-7e6e6986/verify-password", async (c) => {
	const { password } = await c.req.json();
	const adminPw = c.env.ADMIN_PASSWORD;
	if (!adminPw) {
		return c.json({ valid: false, error: "ADMIN_PASSWORD not configured on server" }, 500);
	}
	return c.json({ valid: password === adminPw });
});

app.get("/make-server-7e6e6986/demons", async (c) => {
	const demons = await dbGetByPrefix(c.env.axozap_db, "demon:");
	const sorted = demons.sort((a, b) => parseInt(a.id) - parseInt(b.id));

	const isAdmin = isAuthorized(c);
	if (isAdmin) {
		return c.json(sorted);
	}

	// For public visitors, strip all private information from hidden demons before returning JSON
	const sanitized = sorted.map((d: Demon) => {
		if (d.hidden) {
			return {
				id: d.id,
				name: "Demon Hidden",
				hidden: true,
				difficulty: "Easy",
				rating: "Star",
				gauntlet: false,
				weekly: false,
				event: false,
			};
		}
		return d;
	});

	return c.json(sanitized);
});

app.post("/make-server-7e6e6986/demons", async (c) => {
	const body = await c.req.json();
	const password = body.password;
	const demon = body.demon;
	if (!isAuthorized(c, password)) return c.json({ error: "Unauthorized" }, 401);

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
	const id = c.req.param("id");
	const body = await c.req.json();
	const password = body.password;
	const demon = body.demon;
	if (!isAuthorized(c, password)) return c.json({ error: "Unauthorized" }, 401);

	const demonWithId = { ...demon, id };
	await dbSet(c.env.axozap_db, `demon:${id}`, demonWithId);
	return c.json(demonWithId);
});

app.delete("/make-server-7e6e6986/demons/:id", async (c) => {
	const id = c.req.param("id");
	let password = "";
	try {
		const body = await c.req.json();
		password = body.password;
	} catch {}
	if (!isAuthorized(c, password)) return c.json({ error: "Unauthorized" }, 401);

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

export default app;

// Pages hosts the frontend; one Worker serves both game APIs.
// Override VITE_API_ORIGIN if the backend gets a custom domain later.
const origin = import.meta.env.VITE_API_ORIGIN?.replace(/\/$/, "")
  ?? (import.meta.env.DEV ? "" : "https://axozap-games-backend.peteystillwell.workers.dev");

export const GD_API_URL = `${origin}/api/gd`;
export const CELESTE_API_URL = `${origin}/api/celeste`;

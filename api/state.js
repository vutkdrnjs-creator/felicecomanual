import crypto from "node:crypto";

const DEFAULT_SHEET_ID = "17EbiDOnmkQaCcI8XKArBqwWPgJ2M2wltoDWFzo2725Q";
const SHEET_TITLE = "state";
const RANGE = `'${SHEET_TITLE}'!A1`;
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/spreadsheets";

function base64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function envPrivateKey() {
  return (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
}

async function getAccessToken() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = envPrivateKey();

  if (!clientEmail || !privateKey) {
    const error = new Error("Missing Google service account environment variables.");
    error.status = 500;
    throw error;
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: clientEmail,
    scope: SCOPE,
    aud: TOKEN_URL,
    exp: now + 3600,
    iat: now,
  };
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claim))}`;
  const signature = crypto.createSign("RSA-SHA256").update(unsigned).sign(privateKey, "base64");
  const assertion = `${unsigned}.${signature.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_")}`;

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.error_description || data.error || "Google token request failed.");
    error.status = response.status;
    throw error;
  }
  return data.access_token;
}

async function sheetsRequest(path, options = {}) {
  const sheetId = process.env.GOOGLE_SHEET_ID || DEFAULT_SHEET_ID;
  const token = await getAccessToken();
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const error = new Error(data?.error?.message || "Google Sheets request failed.");
    error.status = response.status;
    error.googleError = data;
    throw error;
  }
  return data;
}

async function ensureStateSheet() {
  try {
    await sheetsRequest(`?fields=sheets.properties.title`);
  } catch (error) {
    throw error;
  }

  const metadata = await sheetsRequest(`?fields=sheets.properties.title`);
  const exists = metadata.sheets?.some((sheet) => sheet.properties?.title === SHEET_TITLE);
  if (exists) return;

  await sheetsRequest(`:batchUpdate`, {
    method: "POST",
    body: JSON.stringify({
      requests: [{ addSheet: { properties: { title: SHEET_TITLE } } }],
    }),
  });
}

async function readState() {
  await ensureStateSheet();
  try {
    const data = await sheetsRequest(`/values/${encodeURIComponent(RANGE)}?valueRenderOption=UNFORMATTED_VALUE`);
    const raw = data.values?.[0]?.[0];
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    if (error.status === 404) return null;
    throw error;
  }
}

async function writeState(payload) {
  await ensureStateSheet();
  const body = {
    range: RANGE,
    majorDimension: "ROWS",
    values: [[JSON.stringify(payload)]],
  };
  await sheetsRequest(`/values/${encodeURIComponent(RANGE)}?valueInputOption=RAW`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const data = await readState();
      res.status(200).json({ ok: true, data });
      return;
    }

    if (req.method === "POST") {
      const payload = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body;
      if (!payload || !Array.isArray(payload.tasks) || !Array.isArray(payload.checklists) || !Array.isArray(payload.manualSections)) {
        res.status(400).json({ ok: false, error: "Invalid FELICE manual payload." });
        return;
      }
      await writeState({ ...payload, updatedAt: new Date().toISOString() });
      res.status(200).json({ ok: true });
      return;
    }

    res.setHeader("Allow", "GET, POST");
    res.status(405).json({ ok: false, error: "Method not allowed." });
  } catch (error) {
    res.status(error.status || 500).json({ ok: false, error: error.message || "Server error." });
  }
}

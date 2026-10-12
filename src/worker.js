import layout from "./layout.json" with { type: "json" };

const JEV_URL = "https://api.typesafe.ai/v1/systemone";
const CONFIDENCE_MIN = 0.6;
const MAX_ITEMS = 60;

const criteria = Object.fromEntries(layout.sections.map((s) => [s.id, s.describe]));

function keywordGuess(item) {
  const text = item.toLowerCase();
  for (const s of layout.sections) {
    if (s.keywords.some((k) => text.includes(k))) return s.id;
  }
  return null;
}

async function classify(item, apiKey) {
  try {
    const res = await fetch(JEV_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        state: item,
        model: "jev-latest",
        questions: {
          section: {
            type: "choice",
            instructions: "Which section of a grocery store would this shopping list item be found in?",
            criteria,
          },
        },
      }),
    });
    if (!res.ok) throw new Error(`Jev ${res.status}`);
    const a = (await res.json()).answers.section;
    // Low-confidence answers go to the "unsure" bucket (section: null) with the guess kept as a suggestion.
    return {
      item,
      section: a.confidence >= CONFIDENCE_MIN ? a.choice : null,
      suggested: a.choice,
      confidence: a.confidence,
      source: "jev",
    };
  } catch {
    const guess = keywordGuess(item);
    return { item, section: guess, suggested: guess, confidence: guess ? 0.5 : 0, source: "keywords" };
  }
}

// Compare without bailing out at the first mismatch, so response time doesn't leak the code.
function codeMatches(given, expected) {
  const a = new TextEncoder().encode(given);
  const b = new TextEncoder().encode(expected);
  let diff = a.length ^ b.length;
  for (let i = 0; i < b.length; i++) diff |= (a[i] ?? 0) ^ b[i];
  return diff === 0;
}

export async function handleApi(request, env) {
  const url = new URL(request.url);
  if (url.pathname === "/api/layout") return Response.json(layout);
  if (url.pathname === "/api/classify" && request.method === "POST") {
    if (!env.TYPESAFE_API_KEY || !env.ACCESS_CODE) {
      return Response.json({ error: "Server is missing TYPESAFE_API_KEY or ACCESS_CODE" }, { status: 500 });
    }
    if (!codeMatches(request.headers.get("X-Access-Code") ?? "", env.ACCESS_CODE)) {
      return Response.json({ error: "Wrong or missing access code" }, { status: 401 });
    }
    const { items } = await request.json();
    if (!Array.isArray(items) || items.length > MAX_ITEMS) {
      return Response.json({ error: `Send up to ${MAX_ITEMS} items` }, { status: 400 });
    }
    const results = await Promise.all(
      items.map((i) => classify(String(i).slice(0, 200), env.TYPESAFE_API_KEY)),
    );
    return Response.json({ results });
  }
  return null;
}

export default {
  async fetch(request, env) {
    return (await handleApi(request, env)) ?? env.ASSETS.fetch(request);
  },
};

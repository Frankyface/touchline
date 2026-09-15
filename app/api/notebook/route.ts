import { env } from "cloudflare:workers";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { initialData } from "@/lib/touchline/model";
import { saveSchema, notebookSchema } from "@/lib/touchline/validation";
export const dynamic = "force-dynamic";
const reply = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return reply({ error: "Sign in to open your notebook." }, 401);
  try {
    if (!env.DB) throw new Error("DB binding unavailable");
    const row = await env.DB.prepare(
      "SELECT data,revision FROM notebooks WHERE user_id=?",
    )
      .bind(user.userId)
      .first<{ data: string; revision: number }>();
    return reply({
      data: row ? notebookSchema.parse(JSON.parse(row.data)) : initialData,
      revision: row?.revision ?? 0,
    });
  } catch (error) {
    console.error("Notebook load failed", error);
    return reply(
      { error: "Your notebook could not be loaded. Try again in a moment." },
      503,
    );
  }
}
export async function PUT(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return reply({ error: "Sign in to save your notebook." }, 401);
  const origin = request.headers.get("Origin");
  if (
    request.headers.get("Sec-Fetch-Site") === "cross-site" ||
    (origin && origin !== new URL(request.url).origin)
  )
    return reply({ error: "Request origin is not allowed." }, 403);
  if (!request.headers.get("Content-Type")?.includes("application/json"))
    return reply({ error: "Expected JSON." }, 415);
  try {
    const body = await request.text();
    if (body.length > 2000000)
      return reply({ error: "Notebook is too large." }, 413);
    let parsed;
    try {
      parsed = saveSchema.safeParse(JSON.parse(body));
    } catch {
      return reply({ error: "Invalid notebook JSON." }, 400);
    }
    if (!parsed.success)
      return reply(
        { error: parsed.error.issues[0]?.message ?? "Invalid notebook." },
        400,
      );
    if (!env.DB) throw new Error("DB binding unavailable");
    const { data, revision } = parsed.data;
    const json = JSON.stringify(data);
    const now = new Date().toISOString();
    const row =
      revision === 0
        ? await env.DB.prepare(
            "INSERT INTO notebooks (user_id,data,revision,updated_at) VALUES (?,?,1,?) ON CONFLICT(user_id) DO NOTHING RETURNING revision",
          )
            .bind(user.userId, json, now)
            .first<{ revision: number }>()
        : await env.DB.prepare(
            "UPDATE notebooks SET data=?, revision=revision+1, updated_at=? WHERE user_id=? AND revision=? RETURNING revision",
          )
            .bind(json, now, user.userId, revision)
            .first<{ revision: number }>();
    if (!row)
      return reply(
        {
          error:
            "This notebook changed on another device. Keep your edits as recovery copies to preserve both versions.",
        },
        409,
      );
    return reply({ revision: row.revision });
  } catch (error) {
    console.error("Notebook save failed", error);
    return reply(
      {
        error:
          "Saving is unavailable. Your edits are still here; retry or download a backup.",
      },
      503,
    );
  }
}

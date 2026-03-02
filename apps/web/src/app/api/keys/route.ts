// apps/web/src/app/api/keys/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

type Json = Record<string, any>;

function normalizeBase(raw?: string) {
  const v = (raw || "https://oneai-api-production.up.railway.app").replace(/\/$/, "");
  // ✅ 关键：强制 localhost 走 IPv4，避免 Node/Next 在某些环境解析到 ::1 导致拒绝连接
  return v.replace(/^http:\/\/localhost(?=:\d+|$)/, "http://127.0.0.1");
}

function env() {
  const base = normalizeBase(process.env.ONEAI_API_BASE_URL || "http://127.0.0.1:4000");
  const key = process.env.ONEAI_ADMIN_API_KEY || "";
  if (!key) {
    return { ok: false as const, status: 500, error: "ONEAI_ADMIN_API_KEY missing" };
  }
  return { ok: true as const, base, key };
}

async function readJsonSafe(res: Response) {
  const text = await res.text();
  if (!text) return { ok: true as const, json: null as any, text: "" };
  try {
    return { ok: true as const, json: JSON.parse(text), text };
  } catch {
    return { ok: false as const, json: null as any, text };
  }
}

async function fetchWithTimeout(url: string, init: RequestInit & { timeoutMs?: number } = {}) {
  const timeoutMs = init.timeoutMs ?? 10_000;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const { timeoutMs: _, ...rest } = init;
    return await fetch(url, { ...rest, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

function ok(res: any, status = 200) {
  return NextResponse.json(res, { status });
}

function fail(payload: Json, status = 500) {
  return NextResponse.json({ success: false, ...payload }, { status });
}

async function requireEmail() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return { ok: false as const, status: 401, error: "unauthorized" };
  return { ok: true as const, email };
}

export async function GET() {
  const auth = await requireEmail();
  if (!auth.ok) return fail({ error: auth.error }, auth.status);

  const e = env();
  if (!e.ok) return fail({ error: e.error }, e.status);

  const url = `${e.base}/v1/admin/keys?userEmail=${encodeURIComponent(auth.email)}`;

  try {
    const r = await fetchWithTimeout(url, {
      headers: { "x-admin-key": e.key },
      cache: "no-store",
      timeoutMs: 10_000,
    });

    const parsed = await readJsonSafe(r);
    if (!parsed.ok) {
      return fail(
        {
          error: "bad_json_from_api",
          url,
          base: e.base,
          status: r.status,
          raw: parsed.text,
        },
        r.status || 502
      );
    }

    // 透传后端结构
    return ok(parsed.json ?? { success: false, error: "empty_response", url }, r.status);
  } catch (err: any) {
    return fail(
      {
        error: "fetch_failed",
        url,
        base: e.base,
        message: err?.name === "AbortError" ? "timeout" : err?.message,
      },
      500
    );
  }
}

export async function POST(req: Request) {
  const auth = await requireEmail();
  if (!auth.ok) return fail({ error: auth.error }, auth.status);

  const e = env();
  if (!e.ok) return fail({ error: e.error }, e.status);

  const body = (await req.json().catch(() => ({}))) as { name?: string };
  const name = (body?.name || "default").toString().slice(0, 64);

  const url = `${e.base}/v1/admin/keys`;

  try {
    const r = await fetchWithTimeout(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": e.key,
      },
      body: JSON.stringify({ userEmail: auth.email, name }),
      timeoutMs: 10_000,
    });

    const parsed = await readJsonSafe(r);
    if (!parsed.ok) {
      return fail(
        { error: "bad_json_from_api", url, base: e.base, status: r.status, raw: parsed.text },
        r.status || 502
      );
    }

    return ok(parsed.json ?? { success: false, error: "empty_response", url }, r.status);
  } catch (err: any) {
    return fail(
      { error: "fetch_failed", url, base: e.base, message: err?.name === "AbortError" ? "timeout" : err?.message },
      500
    );
  }
}

export async function DELETE(req: Request) {
  const auth = await requireEmail();
  if (!auth.ok) return fail({ error: auth.error }, auth.status);

  const e = env();
  if (!e.ok) return fail({ error: e.error }, e.status);

  const body = (await req.json().catch(() => ({}))) as { id?: string };
  const id = (body?.id || "").toString().trim();
  if (!id) return fail({ error: "missing_id" }, 400);

  const url = `${e.base}/v1/admin/keys/revoke`;

  try {
    const r = await fetchWithTimeout(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": e.key,
      },
      body: JSON.stringify({ userEmail: auth.email, id }),
      timeoutMs: 10_000,
    });

    const parsed = await readJsonSafe(r);
    if (!parsed.ok) {
      return fail(
        { error: "bad_json_from_api", url, base: e.base, status: r.status, raw: parsed.text },
        r.status || 502
      );
    }

    return ok(parsed.json ?? { success: false, error: "empty_response", url }, r.status);
  } catch (err: any) {
    return fail(
      { error: "fetch_failed", url, base: e.base, message: err?.name === "AbortError" ? "timeout" : err?.message },
      500
    );
  }
}
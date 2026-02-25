import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

function apiBase() {
  return (process.env.ONEAI_API_BASE_URL || "http://localhost:4000").replace(/\/$/, "");
}
function adminKey() {
  return process.env.ONEAI_ADMIN_API_KEY || "";
}

async function safeReadJson(r: Response) {
  // 204/205 -> 没 body
  if (r.status === 204 || r.status === 205) return null;

  const text = await r.text(); // ✅ 永远先读 text
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { __non_json: true, raw: text.slice(0, 2000) };
  }
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ success: false, error: "unauthorized" }, { status: 401 });
  }

  const url = `${apiBase()}/v1/billing/status?userEmail=${encodeURIComponent(email)}`;

  let r: Response;
  try {
    r = await fetch(url, {
      headers: { "x-admin-key": adminKey() },
      cache: "no-store",
    });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: "upstream_fetch_failed", detail: e?.message || String(e) },
      { status: 502 }
    );
  }

  const parsed = await safeReadJson(r);

  // ✅ upstream 不是 JSON 或者空 body：给前端一个明确的错误结构
  if (!parsed || (parsed as any)?.__non_json) {
    return NextResponse.json(
      {
        success: false,
        error: "bad_upstream_response",
        upstreamStatus: r.status,
        upstreamContentType: r.headers.get("content-type"),
        upstreamBodyPreview: (parsed as any)?.raw || null,
      },
      { status: 502 }
    );
  }

  return NextResponse.json(parsed, { status: r.status });
}
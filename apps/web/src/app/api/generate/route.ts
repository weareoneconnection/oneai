// apps/web/src/app/api/generate/route.ts
import { NextRequest, NextResponse } from "next/server";

const API_BASE = (process.env.ONEAI_API_BASE_URL || "http://127.0.0.1:4000").replace(/\/$/, "");
const API_KEY = process.env.ONEAI_API_KEY || "";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!API_KEY) {
      return NextResponse.json(
        { success: false, error: "Missing ONEAI_API_KEY on web server env" },
        { status: 500 }
      );
    }

    const upstream = await fetch(`${API_BASE}/v1/generate`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        "x-api-key": API_KEY, // ✅ only on server
      },
      body: JSON.stringify(body),
    });

    const contentType = upstream.headers.get("content-type") || "application/json";
    const text = await upstream.text();

    // pass-through status/body
    return new NextResponse(text, {
      status: upstream.status,
      headers: { "content-type": contentType },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Proxy error" },
      { status: 500 }
    );
  }
}
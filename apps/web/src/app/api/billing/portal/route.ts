import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

function apiBase() {
  return (process.env.ONEAI_API_BASE_URL || "http://localhost:4000").replace(/\/$/, "");
}
function adminKey() {
  return process.env.ONEAI_ADMIN_API_KEY || "";
}

export async function POST() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ success: false, error: "unauthorized" }, { status: 401 });

  const r = await fetch(`${apiBase()}/v1/billing/portal`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-admin-key": adminKey(),
    },
    body: JSON.stringify({ userEmail: email }),
    cache: "no-store",
  });

  const j = await r.json().catch(() => null);
  return NextResponse.json(j ?? { success: false, error: "bad response" }, { status: r.status });
}
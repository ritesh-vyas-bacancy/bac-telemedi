import { NextResponse } from "next/server";

export async function GET() {
  const now = new Date().toISOString();
  return NextResponse.json(
    {
      ok: true,
      service: "bac-telemedi",
      status: "healthy",
      timestamp: now,
      commit: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
    },
    { status: 200 },
  );
}

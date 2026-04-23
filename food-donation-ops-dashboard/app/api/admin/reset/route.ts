import { NextResponse } from "next/server";
import { resetGeneratedPages } from "../../../../lib/services/rpc";

export async function POST() {
  try {
    await resetGeneratedPages();
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message ?? "Reset failed" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    message: "Hello from GridLite API!",
    timestamp: new Date().toISOString(),
  });
}

// /app/api/naver/search/route.ts
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query");

  const res = await fetch(`https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(query!)}&display=5&start=1&sort=random`, {
    headers: {
      "X-Naver-Client-Id": process.env.NAVER_CLIENT_ID!,
      "X-Naver-Client-Secret": process.env.NAVER_CLIENT_SECRET!,
    },
  });

  const data = await res.json();
  return NextResponse.json(data);
}

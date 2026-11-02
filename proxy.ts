import { NextResponse, type NextRequest } from "next/server";
import {
  BIRD_DATA_SOURCE,
  BIRD_PROFILE_HEADER,
  getBirdSlug,
  parseBirdCatalog,
} from "./lib/birds";

export async function proxy(request: NextRequest) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return NextResponse.next();
  }

  const response = await fetch(BIRD_DATA_SOURCE, { cache: "no-store" });
  if (!response.ok) {
    return new Response("Bird data is temporarily unavailable.", {
      status: 503,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const { birds } = parseBirdCatalog(await response.text());
  const slug = request.nextUrl.pathname.split("/").at(-1) ?? "";
  const bird = birds.find((candidate) => getBirdSlug(candidate) === slug);

  if (!bird) {
    return new Response("Not Found", {
      status: 404,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "x-robots-tag": "noindex",
      },
    });
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(
    BIRD_PROFILE_HEADER,
    Buffer.from(JSON.stringify(bird), "utf8").toString("base64url"),
  );

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: "/birds/:slug",
};

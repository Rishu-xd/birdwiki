import "server-only";

import { headers } from "next/headers";
import { notFound } from "next/navigation";
import {
  BIRD_PROFILE_HEADER,
  getBirdSlug,
  isValidBird,
  type Bird,
} from "./birds";

export async function getRequestBird(slug: string): Promise<Bird> {
  const encodedBird = (await headers()).get(BIRD_PROFILE_HEADER);
  if (!encodedBird) {
    throw new Error("Bird profile validation header is missing.");
  }

  let value: unknown;
  try {
    value = JSON.parse(
      Buffer.from(encodedBird, "base64url").toString("utf8"),
    );
  } catch {
    throw new Error("Bird profile validation header is invalid.");
  }

  if (!isValidBird(value)) {
    throw new Error("Validated bird profile data is invalid.");
  }
  if (getBirdSlug(value) !== slug) notFound();

  return value;
}

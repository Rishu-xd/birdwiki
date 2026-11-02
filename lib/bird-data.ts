import "server-only";

import { BIRD_DATA_SOURCE, parseBirdCatalog } from "./birds";

let catalogPromise: Promise<ReturnType<typeof parseBirdCatalog>> | undefined;

async function loadBirds() {
  const response = await fetch(BIRD_DATA_SOURCE, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Bird data request failed with status ${response.status}.`);
  }

  const catalog = parseBirdCatalog(await response.text());
  if (!catalog.birds.length) {
    throw new Error("Bird data source returned no species.");
  }

  return catalog;
}

export function getBirdCatalog() {
  if (!catalogPromise) {
    catalogPromise = loadBirds().catch((error: unknown) => {
      catalogPromise = undefined;
      throw error;
    });
  }

  return catalogPromise;
}

export async function getBirds() {
  return (await getBirdCatalog()).birds;
}

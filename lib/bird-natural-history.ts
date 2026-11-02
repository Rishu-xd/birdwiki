import "server-only";

import type { Bird } from "./birds";
import { parseIocBreedingRegions } from "./bird-natural-history-data";

export type NaturalHistoryFact = {
  text: string;
  source: string;
  url: string;
};

export type NaturalHistory = {
  facts: NaturalHistoryFact[];
  unavailableSources: string[];
};

type WikidataEntity = {
  labels?: { en?: { value?: string } };
  descriptions?: { en?: { value?: string } };
  claims?: {
    P225?: {
      mainsnak?: { datavalue?: { value?: unknown } };
    }[];
  };
};

type WikidataResponse = {
  entities?: Record<string, WikidataEntity>;
};

type GbifDescription = {
  taxonKey?: number;
  type?: string;
  language?: string;
  description?: string;
  source?: string;
};

type GbifDescriptionsResponse = {
  results?: GbifDescription[];
};

function normalizedName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function getWikidataFact(
  bird: Bird,
  entity: WikidataEntity | undefined,
): NaturalHistoryFact | null {
  if (!entity) return null;

  const label = entity.labels?.en?.value ?? "";
  const scientificName = entity.claims?.P225?.[0]?.mainsnak?.datavalue?.value;
  const matchesScientificName =
    typeof scientificName === "string" &&
    normalizedName(scientificName) === normalizedName(bird.scientific_name);
  const matchesEnglishName =
    normalizedName(label) === normalizedName(bird.name_en);

  if (!matchesScientificName && !matchesEnglishName) return null;

  const description = entity.descriptions?.en?.value?.trim();
  if (!description || /^species of (?:a )?bird\.?$/i.test(description)) {
    return null;
  }

  return {
    text: description,
    source: "Wikidata",
    url: `https://www.wikidata.org/wiki/${encodeURIComponent(bird.wikidata)}`,
  };
}

function getGbifDistributionFact(
  bird: Bird,
  descriptions: GbifDescription[] | undefined,
): NaturalHistoryFact | null {
  const description = descriptions?.find(
    (item) =>
      item.taxonKey === Number(bird.gbif) &&
      item.type?.toLowerCase() === "distribution" &&
      /^IOC World Bird List\b/i.test(item.source ?? ""),
  );
  if (!description?.description) return null;

  const regions = parseIocBreedingRegions(description.description);
  if (!regions) return null;

  return {
    text: `Breeding range: ${regions}.`,
    source: description.source ?? "IOC World Bird List",
    url: `https://www.gbif.org/species/${encodeURIComponent(bird.gbif)}`,
  };
}

async function fetchWikidataFact(
  bird: Bird,
): Promise<NaturalHistoryFact | null> {
  if (!/^Q\d+$/.test(bird.wikidata)) return null;

  const url = new URL("https://www.wikidata.org/w/api.php");
  url.search = new URLSearchParams({
    action: "wbgetentities",
    ids: bird.wikidata,
    props: "labels|descriptions|claims",
    languages: "en",
    format: "json",
  }).toString();

  const response = await fetch(url, {
    headers: { "User-Agent": "BirdWiki/0.1 (species profile)" },
    signal: AbortSignal.timeout(5000),
    next: { revalidate: 86400 },
  });
  if (!response.ok) throw new Error(`Wikidata returned HTTP ${response.status}.`);

  const data = (await response.json()) as WikidataResponse;
  return getWikidataFact(bird, data.entities?.[bird.wikidata]);
}

async function fetchGbifDistributionFact(
  bird: Bird,
): Promise<NaturalHistoryFact | null> {
  if (!/^\d+$/.test(bird.gbif)) return null;

  const params = new URLSearchParams({
    type: "Distribution",
    limit: "100",
  });
  const response = await fetch(
    `https://api.gbif.org/v1/species/${encodeURIComponent(bird.gbif)}/descriptions?${params}`,
    { signal: AbortSignal.timeout(5000), next: { revalidate: 86400 } },
  );
  if (!response.ok) throw new Error(`GBIF returned HTTP ${response.status}.`);

  const data = (await response.json()) as GbifDescriptionsResponse;
  return getGbifDistributionFact(bird, data.results);
}

async function loadFact(
  source: string,
  load: () => Promise<NaturalHistoryFact | null>,
): Promise<{ fact: NaturalHistoryFact | null; unavailable: string | null }> {
  try {
    return { fact: await load(), unavailable: null };
  } catch {
    return { fact: null, unavailable: source };
  }
}

export async function getBirdNaturalHistory(
  bird: Bird,
): Promise<NaturalHistory> {
  const [wikidata, gbif] = await Promise.all([
    loadFact("Wikidata", () => fetchWikidataFact(bird)),
    loadFact("GBIF", () => fetchGbifDistributionFact(bird)),
  ]);

  return {
    facts: [wikidata.fact, gbif.fact].filter(
      (fact): fact is NaturalHistoryFact => fact !== null,
    ),
    unavailableSources: [wikidata.unavailable, gbif.unavailable].filter(
      (source): source is string => source !== null,
    ),
  };
}

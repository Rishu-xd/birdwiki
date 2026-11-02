import { parse } from "csv-parse/sync";

export const BIRD_DATA_SOURCE =
  "https://raw.githubusercontent.com/alchaincyf/huashu-bird-sticker/main/data/species.csv";
export const BIRD_PROFILE_HEADER = "x-birdwiki-profile";

export type Bird = {
  id: string;
  ioc_seq: string;
  name_en: string;
  name_zh_hans: string;
  name_zh_hant: string;
  scientific_name: string;
  authority: string;
  order: string;
  family: string;
  wikidata: string;
  ebird: string;
  gbif: string;
  inaturalist: string;
  sticker_kind: string;
  sticker_license: string;
  review_score: string;
  meets_quality_bar: string;
  reference_type: string;
  reference_page: string;
  reference_author: string;
  reference_license: string;
};

export type BirdCatalog = {
  birds: Bird[];
  rejectedRecords: number;
};

export function isValidBird(value: unknown): value is Bird {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;
  const fields: (keyof Bird)[] = [
    "id",
    "ioc_seq",
    "name_en",
    "name_zh_hans",
    "name_zh_hant",
    "scientific_name",
    "authority",
    "order",
    "family",
    "wikidata",
    "ebird",
    "gbif",
    "inaturalist",
    "sticker_kind",
    "sticker_license",
    "review_score",
    "meets_quality_bar",
    "reference_type",
    "reference_page",
    "reference_author",
    "reference_license",
  ];

  if (!fields.every((field) => typeof record[field] === "string")) {
    return false;
  }

  const bird = value as Bird;
  return (
    /^[A-Za-z0-9_]+$/.test(bird.id) &&
    Boolean(
      bird.name_en.trim() &&
        bird.scientific_name.trim() &&
        bird.order.trim() &&
        bird.family.trim(),
    )
  );
}

export function parseBirdCatalog(csvText: string): BirdCatalog {
  const records = parse<Record<string, string>>(csvText, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
  });

  const candidates = records.flatMap((record) => {
    const bird: Bird = {
      id: record.id ?? "",
      ioc_seq: record.ioc_seq ?? "",
      name_en: record.name_en ?? "",
      name_zh_hans: record.name_zh_hans ?? "",
      name_zh_hant: record.name_zh_hant ?? "",
      scientific_name: record.scientific_name ?? "",
      authority: record.authority ?? "",
      order: record.order ?? "",
      family: record.family ?? "",
      wikidata: record.wikidata ?? "",
      ebird: record.ebird ?? "",
      gbif: record.gbif ?? "",
      inaturalist: record.inaturalist ?? "",
      sticker_kind: record.sticker_kind ?? "",
      sticker_license: record.sticker_license ?? "",
      review_score: record.review_score ?? "",
      meets_quality_bar: record.meets_quality_bar ?? "",
      reference_type: record.reference_type ?? "",
      reference_page: record.reference_page ?? "",
      reference_author: record.reference_author ?? "",
      reference_license: record.reference_license ?? "",
    };

    return isValidBird(bird) ? [bird] : [];
  });

  const seenIds = new Set<string>();
  const seenSlugs = new Set<string>();
  const birds = candidates.filter((bird) => {
    const slug = getBirdSlug(bird);
    if (seenIds.has(bird.id) || seenSlugs.has(slug)) return false;
    seenIds.add(bird.id);
    seenSlugs.add(slug);
    return true;
  });

  return {
    birds,
    rejectedRecords: records.length - birds.length,
  };
}

export function parseBirdsCsv(csvText: string): Bird[] {
  return parseBirdCatalog(csvText).birds;
}

export function getBirdSlug(bird: Bird): string {
  const name = bird.name_en
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const id = bird.id.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  return `${name || "bird"}-${id}`;
}

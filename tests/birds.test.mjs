import assert from "node:assert/strict";
import test from "node:test";
import { parseBirdCatalog, getBirdSlug } from "../lib/birds.ts";
import { parseIocBreedingRegions } from "../lib/bird-natural-history-data.ts";

const headers = [
  "id",
  "ioc_seq",
  "order",
  "family",
  "scientific_name",
  "authority",
  "name_en",
  "name_zh_hans",
  "name_zh_hant",
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

function csvRow(values) {
  return headers
    .map((header) => {
      const value = values[header] ?? "";
      return `"${value.replaceAll('"', '""')}"`;
    })
    .join(",");
}

function birdRecord(overrides = {}) {
  return {
    id: "Struthio_camelus",
    order: "Struthioniformes",
    family: "Struthionidae",
    scientific_name: "Struthio camelus",
    name_en: "Common Ostrich",
    reference_author: "Example author",
    ...overrides,
  };
}

test("parses quoted multiline CSV fields and keeps valid species", () => {
  const csv = [
    headers.join(","),
    csvRow(birdRecord({ reference_author: "First line\nSecond line" })),
  ].join("\n");

  const { birds, rejectedRecords } = parseBirdCatalog(csv);

  assert.equal(birds.length, 1);
  assert.equal(birds[0].reference_author, "First line\nSecond line");
  assert.equal(rejectedRecords, 0);
});

test("rejects malformed, incomplete, and duplicate species rows", () => {
  const csv = [
    headers.join(","),
    csvRow(birdRecord()),
    csvRow(birdRecord({ id: "", name_en: "Missing ID" })),
    csvRow(birdRecord({ id: "Incomplete", scientific_name: "" })),
    csvRow(birdRecord({ name_en: "Duplicate ID" })),
  ].join("\n");

  const { birds, rejectedRecords } = parseBirdCatalog(csv);

  assert.equal(birds.length, 1);
  assert.equal(birds[0].name_en, "Common Ostrich");
  assert.equal(rejectedRecords, 3);
});

test("builds stable human-readable slugs from names and scientific IDs", () => {
  const bird = birdRecord({ name_en: "Grey Treepie", id: "Dendrocitta_formosae" });

  assert.equal(getBirdSlug(bird), "grey-treepie-dendrocitta-formosae");
});

test("translates known IOC breeding regions and omits unknown codes", () => {
  assert.equal(
    parseIocBreedingRegions("Breeding regions are NA, MA. Breeding subregions are e, s USA."),
    "North America, Middle America",
  );
  assert.equal(
    parseIocBreedingRegions("Breeding regions are Worldwide. Breeding subregions are widespread."),
    "Worldwide",
  );
  assert.equal(parseIocBreedingRegions("Breeding regions are XX."), null);
});

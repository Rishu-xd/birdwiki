const IOC_REGIONS: Record<string, string> = {
  AF: "Africa",
  AN: "Antarctica",
  AS: "Asia",
  AU: "Australasia",
  EU: "Europe",
  MA: "Middle America",
  NA: "North America",
  NT: "the Neotropics",
  OC: "Oceania",
  PA: "the Pacific",
  SA: "South America",
};

export function parseIocBreedingRegions(description: string) {
  const match = description.match(/Breeding regions are ([^.]+)\./i);
  if (!match) return null;

  const tokens = match[1]
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean);
  if (!tokens.length) return null;
  if (tokens.some((token) => token.toLowerCase() === "worldwide")) {
    return "Worldwide";
  }

  const regions = tokens.map((token) => IOC_REGIONS[token.toUpperCase()]);
  if (regions.some((region) => !region)) return null;

  return [...new Set(regions)].join(", ");
}

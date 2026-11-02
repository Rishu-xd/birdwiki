import type { MetadataRoute } from "next";
import { getBirds } from "../lib/bird-data";
import { getBirdSlug } from "../lib/birds";
import { SITE_URL } from "../lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const birds = await getBirds();

  return [
    {
      url: SITE_URL,
      changeFrequency: "weekly",
      priority: 1,
    },
    ...birds.map((bird) => ({
      url: `${SITE_URL}/birds/${getBirdSlug(bird)}`,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}

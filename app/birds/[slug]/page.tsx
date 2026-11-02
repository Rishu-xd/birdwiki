import type { Metadata } from "next";
import Link from "next/link";
import { getBirdNaturalHistory } from "../../../lib/bird-natural-history";
import { getRequestBird } from "../../../lib/bird-request";
import { getBirdSlug, type Bird } from "../../../lib/birds";
import { SITE_URL } from "../../../lib/site";

type BirdPageProps = {
  params: Promise<{ slug: string }>;
};

export const instant = false;

function getBirdDescription(bird: Bird) {
  const taxonomy = [
    bird.order && `${bird.order} order`,
    bird.family && `${bird.family} family`,
  ]
    .filter(Boolean)
    .join(" and ");
  const names = [bird.name_zh_hans, bird.name_zh_hant]
    .filter(Boolean)
    .join(" and ");
  const identity = bird.scientific_name
    ? `${bird.name_en} (${bird.scientific_name})`
    : bird.name_en;

  return [
    `${identity}${taxonomy ? ` is classified in the ${taxonomy}` : ""}.`,
    names ? `Also known as ${names}.` : "",
    "Explore its taxonomy, naming, and species references on BirdWiki.",
  ]
    .filter(Boolean)
    .join(" ");
}

export async function generateMetadata({
  params,
}: BirdPageProps): Promise<Metadata> {
  const { slug } = await params;
  const bird = await getRequestBird(slug);

  const title = bird.scientific_name
    ? `${bird.name_en} (${bird.scientific_name})`
    : bird.name_en;
  const description = getBirdDescription(bird);
  const url = `${SITE_URL}/birds/${getBirdSlug(bird)}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: "BirdWiki",
      type: "article",
      images: ["/bg.png"],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/bg.png"],
    },
  };
}

export default async function BirdPage({ params }: BirdPageProps) {
  const { slug } = await params;
  const bird = await getRequestBird(slug);

  const naturalHistory = await getBirdNaturalHistory(bird);
  const details = [
    ["Scientific name", bird.scientific_name],
    ["Order", bird.order],
    ["Family", bird.family],
    ["Name authority", bird.authority],
    ["Simplified Chinese name", bird.name_zh_hans],
    ["Traditional Chinese name", bird.name_zh_hant],
    ["IOC sequence", bird.ioc_seq],
  ].filter((detail): detail is [string, string] => Boolean(detail[1]));
  const description = getBirdDescription(bird);
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Taxon",
    name: bird.name_en,
    alternateName: [bird.scientific_name, bird.name_zh_hans, bird.name_zh_hant]
      .filter(Boolean),
    description,
    taxonRank: "species",
    ...(bird.family ? { parentTaxon: bird.family } : {}),
    url: `${SITE_URL}/birds/${getBirdSlug(bird)}`,
    sameAs: [
      bird.wikidata && `https://www.wikidata.org/wiki/${encodeURIComponent(bird.wikidata)}`,
      bird.ebird && `https://ebird.org/species/${encodeURIComponent(bird.ebird)}`,
      bird.gbif && `https://www.gbif.org/species/${encodeURIComponent(bird.gbif)}`,
      bird.inaturalist &&
        `https://www.inaturalist.org/taxa/${encodeURIComponent(bird.inaturalist)}`,
    ].filter(Boolean),
  };

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-12 text-zinc-100 sm:py-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
      <article className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="text-sm text-emerald-300 underline underline-offset-4 hover:text-emerald-200"
        >
          BirdWiki home
        </Link>

        <header className="mt-10 border-b border-white/15 pb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
            Bird species profile
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
            {bird.name_en}
          </h1>
          {bird.scientific_name && (
            <p className="mt-3 text-xl italic text-zinc-300">
              {bird.scientific_name}
            </p>
          )}
          <p className="mt-5 max-w-2xl leading-7 text-zinc-300">
            {description}
          </p>
        </header>

        <section className="py-8" aria-labelledby="taxonomy-heading">
          <h2 id="taxonomy-heading" className="text-xl font-semibold">
            Taxonomy and names
          </h2>
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            {details.map(([label, value]) => (
              <div
                key={label}
                className="rounded-xl border border-white/15 bg-white/5 p-4"
              >
                <dt className="text-xs uppercase tracking-wide text-zinc-400">
                  {label}
                </dt>
                <dd className="mt-1 font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        {(naturalHistory.facts.length > 0 ||
          naturalHistory.unavailableSources.length > 0) && (
          <section
            className="border-t border-white/15 py-8"
            aria-labelledby="natural-history-heading"
          >
            <h2 id="natural-history-heading" className="text-xl font-semibold">
              Natural history
            </h2>
            {naturalHistory.facts.length > 0 && (
              <ul className="mt-4 space-y-3">
                {naturalHistory.facts.map((fact) => (
                  <li
                    key={fact.source}
                    className="rounded-xl border border-white/15 bg-white/5 p-4"
                  >
                    <p>{fact.text}</p>
                    <p className="mt-2 text-sm text-zinc-400">
                      Source:{" "}
                      <a
                        href={fact.url}
                        rel="noreferrer"
                        target="_blank"
                        className="text-emerald-300 underline underline-offset-4 hover:text-emerald-200"
                      >
                        {fact.source}
                      </a>
                    </p>
                  </li>
                ))}
              </ul>
            )}
            {naturalHistory.unavailableSources.length > 0 && (
              <p className="mt-4 text-sm text-zinc-400" role="status">
                Additional information is temporarily unavailable from{" "}
                {naturalHistory.unavailableSources.join(" and ")}.
              </p>
            )}
          </section>
        )}

        <section className="border-t border-white/15 py-8" aria-labelledby="references-heading">
          <h2 id="references-heading" className="text-xl font-semibold">
            Species references
          </h2>
          <ul className="mt-4 flex flex-wrap gap-3 text-sm">
            {bird.wikidata && (
              <li>
                <a
                  href={`https://www.wikidata.org/wiki/${encodeURIComponent(bird.wikidata)}`}
                  rel="noreferrer"
                  target="_blank"
                  className="text-emerald-300 underline underline-offset-4 hover:text-emerald-200"
                >
                  Wikidata
                </a>
              </li>
            )}
            {bird.ebird && (
              <li>
                <a
                  href={`https://ebird.org/species/${encodeURIComponent(bird.ebird)}`}
                  rel="noreferrer"
                  target="_blank"
                  className="text-emerald-300 underline underline-offset-4 hover:text-emerald-200"
                >
                  eBird
                </a>
              </li>
            )}
            {bird.gbif && (
              <li>
                <a
                  href={`https://www.gbif.org/species/${encodeURIComponent(bird.gbif)}`}
                  rel="noreferrer"
                  target="_blank"
                  className="text-emerald-300 underline underline-offset-4 hover:text-emerald-200"
                >
                  GBIF
                </a>
              </li>
            )}
            {bird.inaturalist && (
              <li>
                <a
                  href={`https://www.inaturalist.org/taxa/${encodeURIComponent(bird.inaturalist)}`}
                  rel="noreferrer"
                  target="_blank"
                  className="text-emerald-300 underline underline-offset-4 hover:text-emerald-200"
                >
                  iNaturalist
                </a>
              </li>
            )}
            {bird.reference_page && (
              <li>
                <a
                  href={bird.reference_page}
                  rel="noreferrer"
                  target="_blank"
                  className="text-emerald-300 underline underline-offset-4 hover:text-emerald-200"
                >
                  Source reference
                </a>
              </li>
            )}
          </ul>
          {bird.reference_author && (
            <p className="mt-5 text-sm text-zinc-400">
              Reference credited to {bird.reference_author}
              {bird.reference_license ? ` · ${bird.reference_license}` : ""}
            </p>
          )}
        </section>
      </article>
    </main>
  );
}

"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
} from "motion/react";

const DATA_SOURCE =
  "https://raw.githubusercontent.com/alchaincyf/huashu-bird-sticker/main/data/species.csv";

const suggestions = ["Northern cardinal", "Bird calls", "Backyard birds"] as const;

type Bird = {
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

function CountUpStat({ value, delay }: { value: number; delay: number }) {
  const count = useMotionValue(0);
  const [currentValue, setCurrentValue] = useState(0);

  useMotionValueEvent(count, "change", (latest) => {
    setCurrentValue(Math.round(latest));
  });

  useEffect(() => {
    const animation = animate(count, value, {
      duration: 2.4,
      delay,
      ease: "easeOut",
    });

    return () => animation.stop();
  }, [count, delay, value]);

  return (
    <span className="inline-flex">
      {currentValue.toLocaleString().split("").map((character, index) =>
        /\d/.test(character) ? (
          <span
            key={index}
            className="relative inline-flex h-[1em] min-w-[0.62em] overflow-hidden align-bottom"
          >
            <AnimatePresence mode="sync">
              <motion.span
                key={character}
                initial={{ y: "100%" }}
                animate={{ y: "0%" }}
                exit={{ y: "-100%" }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="absolute inset-0 flex justify-center"
              >
                {character}
              </motion.span>
            </AnimatePresence>
          </span>
        ) : (
          <span key={`${index}-${character}`}>{character}</span>
        ),
      )}
    </span>
  );
}

type BirdPhoto = {
  thumbnail: string;
  title: string;
  artist: string;
  license: string;
  licenseUrl: string;
  pageUrl: string;
};

type CommonsPage = {
  title: string;
  imageinfo?: {
    thumburl?: string;
    descriptionurl?: string;
    extmetadata?: Record<string, { value?: string }>;
  }[];
};

const isAllowedImageLicense = (license: string) =>
  /^(CC0|Public domain|CC BY-SA(?:\s|$)|CC BY(?:\s|$))/i.test(license);

function cleanMetadata(value: string | undefined) {
  return value
    ? new DOMParser().parseFromString(value, "text/html").body.textContent?.trim() ??
        ""
    : "";
}

async function findCommonsBirdImage(
  bird: Bird,
  signal: AbortSignal,
  width: number,
): Promise<BirdPhoto | null> {
  const searchTerms = [
    `filetype:bitmap "${bird.scientific_name}" illustration`,
    `filetype:bitmap "${bird.scientific_name}"`,
    `filetype:bitmap "${bird.name_en}"`,
  ];

  for (const searchTerm of searchTerms) {
    const search = new URLSearchParams({
      action: "query",
      generator: "search",
      gsrsearch: searchTerm,
      gsrnamespace: "6",
      gsrlimit: "20",
      prop: "imageinfo",
      iiprop: "url|extmetadata",
      iiurlwidth: String(width),
      format: "json",
      origin: "*",
    });

    const response = await fetch(
      `https://commons.wikimedia.org/w/api.php?${search}`,
      { signal },
    );
    if (!response.ok) {
      throw new Error("Bird images are unavailable.");
    }

    const data = (await response.json()) as {
      query?: { pages?: Record<string, CommonsPage> };
    };
    const image = Object.values(data.query?.pages ?? [])
      .map((page) => {
        const info = page.imageinfo?.[0];
        const metadata = info?.extmetadata;
        const license = metadata?.LicenseShortName?.value?.trim() ?? "";

        if (
          !info?.thumburl ||
          !info.descriptionurl ||
          !isAllowedImageLicense(license)
        ) {
          return null;
        }

        const licenseUrl = metadata?.LicenseUrl?.value ?? "";
        return {
          thumbnail: info.thumburl,
          title: page.title,
          artist: cleanMetadata(metadata?.Artist?.value),
          license,
          licenseUrl: licenseUrl.startsWith("https://") ? licenseUrl : "",
          pageUrl: info.descriptionurl,
        };
      })
      .find((candidate): candidate is BirdPhoto => candidate !== null);

    if (image) return image;
  }

  return null;
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      cells.push(current);
      current = "";
      continue;
    }

    if (char === "\r") {
      continue;
    }

    current += char;
  }

  cells.push(current);
  return cells;
}

function parseSpeciesCsv(csvText: string): Bird[] {
  const rows = csvText.trim().split(/\r?\n/);
  if (rows.length < 2) return [];

  const headers = parseCsvLine(rows[0]);
  return rows.slice(1).flatMap((row) => {
    if (!row.trim()) return [];

    const values = parseCsvLine(row);
    const record: Record<string, string> = {};

    headers.forEach((header, index) => {
      record[header] = values[index] ?? "";
    });

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

    return bird.id ? [bird] : [];
  });
}

function BirdResultImage({ bird }: { bird: Bird }) {
  const [image, setImage] = useState<BirdPhoto | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    findCommonsBirdImage(bird, controller.signal, 240)
      .then(setImage)
      .catch(() => {
        if (!controller.signal.aborted) setImage(null);
      });

    return () => controller.abort();
  }, [bird]);

  return (
    <div
      className="flex w-[88px] shrink-0 flex-col items-center  gap-1"
    >
      <div
        title={
          image
            ? `${image.artist || image.title} · ${image.license} · Wikimedia Commons`
            : `Open-license ${bird.name_en} image`
        }
        className="relative flex size-[76px] items-center justify-center overflow-hidden  rounded-sm border border-white bg-white p-1 shadow-md shadow-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-800"
      >
        {(!image || !loaded) && (
          <motion.div
            aria-hidden="true"
            animate={{ opacity: [0.2, 1, 0.2] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <Image
              src="/svg/bird.svg"
              alt=""
              width={40}
              height={40}
              className="size-10"
            />
          </motion.div>
        )}
        {image && (
          <Image
            src={image.thumbnail}
            alt={`${bird.name_en} bird`}
            width={68}
            height={68}
            unoptimized
            onLoad={() => setLoaded(true)}
            className={`size-full object-contain drop-shadow-[0_3px_3px_rgba(0,0,0,0.2)] transition-opacity duration-500 ${
              loaded ? "opacity-100" : "opacity-0"
            }`}
          />
        )}
      </div>
      {image && (
        <span className="w-full truncate text-center text-[9px] leading-3 text-zinc-500 dark:text-zinc-400">
          {image.artist || "Wikimedia Commons"} · {image.license}
        </span>
      )}
    </div>
  );
}

function BirdDetailsModal({
  bird,
  onClose,
}: {
  bird: Bird;
  onClose: () => void;
}) {
  const [photo, setPhoto] = useState<BirdPhoto | null>(null);
  const [photoLoaded, setPhotoLoaded] = useState(false);
  const [photoState, setPhotoState] = useState<
    "loading" | "ready" | "unavailable" | "error"
  >("loading");

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  useEffect(() => {
    const controller = new AbortController();
    findCommonsBirdImage(bird, controller.signal, 1200)
      .then((image) => {
        if (!controller.signal.aborted) {
          setPhoto(image);
          setPhotoState(image ? "ready" : "unavailable");
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setPhoto(null);
          setPhotoState("error");
        }
      });

    return () => controller.abort();
  }, [bird]);

  const details = [
    ["Family", bird.family],
    ["Authority", bird.authority],
    ["IOC sequence", bird.ioc_seq],
    ["Species ID", bird.id],
    ["Order", bird.order],
    ["Simplified Chinese", bird.name_zh_hans],
    ["Traditional Chinese", bird.name_zh_hant],
    ["Wikidata", bird.wikidata],
    ["eBird", bird.ebird],
    ["GBIF", bird.gbif],
    ["iNaturalist", bird.inaturalist],
    ["Sticker type", bird.sticker_kind],
    ["Sticker license", bird.sticker_license],
    ["Reference license", bird.reference_license],
  ].filter(([, value]) => value);

  return (
    <motion.div
      role="presentation"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/45 p-4 backdrop-blur-md sm:p-8"
    >
      <motion.section
        role="dialog"
        aria-modal="true"
        aria-labelledby="bird-details-title"
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 8 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="grid h-[86vh] w-[92vw] max-w-6xl grid-cols-1 grid-rows-[minmax(220px,0.9fr)_minmax(0,1.1fr)] overflow-hidden rounded-[1.75rem] border border-white/20 bg-[#252927]/40 text-zinc-100 shadow-2xl shadow-black/30 backdrop-blur-2xl backdrop-saturate-150 sm:h-[82vh] md:grid-cols-[1.05fr_1fr] md:grid-rows-1"
      >
        <section className="relative flex min-h-0 flex-col border-b border-emerald-400/15 md:border-b-0 md:border-r backdrop-blur-2xl">
          <div className="relative min-h-[220px] flex-1 overflow-hidden backdroup-blur-[1px] md:min-h-0">
            {photo && (
              <Image
                src={photo.thumbnail}
                alt={`${bird.name_en} in the wild`}
                fill
                unoptimized
                sizes="(max-width: 768px) 90vw, 45vw"
                onLoad={() => setPhotoLoaded(true)}
                onError={() => {
                  setPhoto(null);
                  setPhotoLoaded(false);
                  setPhotoState("error");
                }}
                className={`z-10 object-contain p-6 transition-opacity duration-500 sm:p-10 ${
                  photoLoaded ? "opacity-100" : "opacity-0"
                }`}
              />
            )}
            {(!photo || !photoLoaded) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
                <motion.div
                  aria-hidden="true"
                  animate={{ opacity: [0.2, 1, 0.2] }}
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="flex items-center justify-center"
                >
                  <Image
                    src="/svg/bird.svg"
                    alt=""
                    width={120}
                    height={120}
                    className="size-24"
                  />
                </motion.div>
                <p className="text-xs text-zinc-400">
                  {photo
                    ? "Loading bird photo..."
                    : photoState === "loading"
                      ? "Finding an openly licensed bird photo..."
                      : photoState === "error"
                        ? "Could not load a bird photo right now"
                        : "No openly licensed photo found"}
                </p>
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#252927] via-[#252927]/75 to-transparent px-6 pb-5 pt-16 sm:px-8">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300">
                Bird species
              </p>
              <h2
                id="bird-details-title"
                className="mt-1 text-2xl font-semibold tracking-tight text-emerald-100 sm:text-3xl"
              >
                {bird.name_en}
              </h2>
              <p className="mt-1 text-sm italic text-zinc-300">
                {bird.scientific_name}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 px-5 py-3 text-[10px] text-zinc-400 sm:px-7">
            <span className="truncate">
              {photo
                ? `Photo: ${photo.artist || photo.title}`
                : "Bird species reference"}
            </span>
            {photo && (
              <motion.a
                href={photo.pageUrl}
                target="_blank"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.95 }}
                rel="noreferrer"
                className="shrink-0 text-emerald-300 underline underline-offset-2 hover:text-emerald-200"
              >
                {photo.license}
              </motion.a>
            )}
          </div>
        </section>

        <section className="flex min-h-0 flex-col">
          <header className="flex items-center justify-between gap-4 px-5 pb-3 pt-4 sm:px-7">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300">
                Field guide
              </p>
              <p className="mt-1 text-xs text-zinc-400">
                Species profile and references
              </p>
            </div>
            <button
              type="button"
              autoFocus
              onClick={onClose}
              aria-label="Close bird details"
              className="flex size-8 shrink-0 items-center justify-center rounded-full border border-white/15 text-lg text-zinc-300 transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
            >
              ×
            </button>
          </header>

          <div className="flex-1 overflow-y-auto px-5 pb-4 sm:px-7">
            <dl className="grid grid-cols-2 gap-x-5 gap-y-3">
              {details.map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <dt className="text-[10px] text-zinc-400">{label}</dt>
                  <dd className="mt-0.5 break-words text-xs font-medium leading-4 text-zinc-100">
                    {value}
                  </dd>
                </div>
              ))}
              {bird.reference_author && (
                <div className="min-w-0">
                  <dt className="text-[10px] text-zinc-400">Reference author</dt>
                  <dd className="mt-0.5 break-words text-xs font-medium text-zinc-100">
                    {bird.reference_author}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          <footer className="flex flex-wrap gap-2 border-t border-white/10 px-5 py-4 sm:px-7">
            {bird.wikidata && (
              <motion.a
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.95 }}
                href={`https://www.wikidata.org/wiki/${encodeURIComponent(bird.wikidata)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-w-28 items-center justify-center rounded-full bg-emerald-700 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-600"
              >
                Wiki
              </motion.a>
            )}
            {photo?.licenseUrl && (
              <a
                href={photo.licenseUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-w-28 items-center justify-center rounded-full bg-emerald-700 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-600"
              >
                Photo license
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              className="ml-auto rounded-full border border-white/15 px-5 py-2 text-sm text-zinc-200 transition-colors hover:bg-white/10"
            >
              Close
            </button>
          </footer>
        </section>
      </motion.section>
    </motion.div>
  );
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [birds, setBirds] = useState<Bird[]>([]);
  const [results, setResults] = useState<Bird[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBird, setSelectedBird] = useState<Bird | null>(null);
  const [dataLoadError, setDataLoadError] = useState(false);
  const dataRequestRef = useRef<Promise<Bird[]> | null>(null);

  const getBirdData = useCallback(() => {
    if (!dataRequestRef.current) {
      dataRequestRef.current = fetch(DATA_SOURCE).then(async (response) => {
        if (!response.ok) {
          throw new Error("Bird data is unavailable.");
        }

        const csvText = await response.text();
        return parseSpeciesCsv(csvText);
      });
    }

    return dataRequestRef.current;
  }, []);

  useEffect(() => {
    let active = true;

    getBirdData()
      .then((nextBirds) => {
        if (!active) return;
        setBirds(nextBirds);
      })
      .catch(() => {
        if (!active) return;
        setBirds([]);
        setDataLoadError(true);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [getBirdData]);

  const loadBirds = async (searchTerm?: string) => {
    if (birds.length > 0) {
      if (searchTerm) {
        const normalized = searchTerm.trim().toLowerCase();
        const matches = birds.filter((bird) =>
          [
            bird.name_en,
            bird.name_zh_hans,
            bird.scientific_name,
            bird.order,
            bird.family,
            bird.id,
          ]
            .join(" ")
            .toLowerCase()
            .includes(normalized),
        );
        setResults(matches.slice(0, 8));
      }
      return;
    }

    setIsLoading(true);

    try {
      const nextBirds = await getBirdData();
      setBirds(nextBirds);

      if (searchTerm) {
        const normalized = searchTerm.trim().toLowerCase();
        const matches = nextBirds.filter((bird) =>
          [
            bird.name_en,
            bird.name_zh_hans,
            bird.scientific_name,
            bird.order,
            bird.family,
            bird.id,
          ]
            .join(" ")
            .toLowerCase()
            .includes(normalized),
        );
        setResults(matches.slice(0, 8));
      }
    } catch {
      setBirds([]);
      setResults([]);
      setDataLoadError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQueryChange = (nextValue: string) => {
    setQuery(nextValue);

    const trimmed = nextValue.trim();
    if (!trimmed) {
      setResults([]);
      return;
    }

    if (birds.length > 0) {
      const normalized = trimmed.toLowerCase();
      const matches = birds.filter((bird) =>
        [
          bird.name_en,
          bird.name_zh_hans,
          bird.scientific_name,
          bird.order,
          bird.family,
          bird.id,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalized),
      );
      setResults(matches.slice(0, 8));
      return;
    }

    void loadBirds(trimmed);
  };

  const handleRandom = async () => {
    let availableBirds = birds;

    if (!availableBirds.length) {
      setIsLoading(true);
      try {
        availableBirds = await getBirdData();
        setBirds(availableBirds);
      } catch {
        setDataLoadError(true);
        return;
      } finally {
        setIsLoading(false);
      }
    }

    if (!availableBirds.length) {
      setDataLoadError(true);
      return;
    }

    setDataLoadError(false);
    setSelectedBird(availableBirds[Math.floor(Math.random() * availableBirds.length)]);
  };

  return (
    <main className="relative isolate flex min-h-screen flex-1 items-start justify-center overflow-x-clip bg-zinc-950 px-6 pb-20 pt-12 font-sans text-zinc-50">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage:
            "linear-gradient(rgba(8, 20, 17, 0.38), rgba(8, 20, 17, 0.58)), url('/bg.png')",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(16,185,129,0.2),transparent_55%)]"
      />

      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, ease: "easeOut" }}
        className="relative z-10 w-full max-w-2xl text-center"
      >
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.45, ease: "easeOut" }}
          aria-label="Bird data summary"
          className="mb-4 grid grid-cols-3 gap-2 sm:gap-3"
        >
          {[
            {
              label: "Species",
              value: birds.length
                ? new Set(
                    birds.map((bird) => bird.scientific_name).filter(Boolean),
                  ).size
                : isLoading
                  ? null
                  : 0,
            },
            {
              label: "Bird profiles",
              value: birds.length ? birds.length : isLoading ? null : 0,
            },
            {
              label: "Bird families",
              value: birds.length
                ? new Set(birds.map((bird) => bird.family).filter(Boolean)).size
                : isLoading
                  ? null
                  : 0,
            },
          ].map(({ label, value }, index) => (
            <div
              key={label}
              className="rounded-2xl border border-white/25 bg-white/10 px-3 py-3 shadow-lg shadow-black/10 backdrop-blur-xl sm:px-4"
            >
              <p className="overflow-hidden text-xl font-semibold leading-tight text-white sm:text-2xl">
                {dataLoadError ? (
                  "—"
                ) : value === null ? (
                  "…"
                ) : (
                  <CountUpStat value={value} delay={0.25 + index * 0.16} />
                )}
              </p>
              <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.14em] text-white/80 sm:text-xs">
                {label}
              </p>
            </div>
          ))}
        </motion.div>
        {dataLoadError && (
          <p role="status" className="mb-3 text-sm text-amber-100">
            Bird data could not be loaded. Please check your connection and refresh.
          </p>
        )}
        <motion.form
          action="/"
          method="get"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5, ease: "easeOut" }}
          className="mt-9 flex w-full items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-2 shadow-lg shadow-zinc-900/5 transition-[border-color,box-shadow] focus-within:border-emerald-500 focus-within:shadow-xl focus-within:shadow-emerald-900/10 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/20 dark:focus-within:border-emerald-400"
        >
          <label htmlFor="bird-search" className="sr-only">
            Search BirdWiki
          </label>
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            className="ml-3 size-5 shrink-0 text-zinc-400"
          >
            <circle
              cx="10.8"
              cy="10.8"
              r="6.8"
              stroke="currentColor"
              strokeWidth="1.7"
            />
            <path
              d="m16 16 4 4"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="1.7"
            />
          </svg>
          <input
            id="bird-search"
            type="search"
            name="q"
            value={query}
            onChange={(event) => handleQueryChange(event.target.value)}
            placeholder="Search birds, habitats, or behaviors..."
            className="min-w-0 flex-1 bg-transparent py-3 text-base text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-100 dark:placeholder:text-zinc-500"
          />
          <motion.button
            type="button"
            onClick={handleRandom}
            whileTap={{scale:0.95, rotateX:30}}
            whileHover={{scale:1.05}}
            className="flex shrink-0 items-center cursor-pointer justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 dark:bg-emerald-500 dark:text-zinc-950 dark:hover:bg-emerald-400"
          >
            <Image
              src="/svg/dice.svg"
              alt=""
              width={16}
              height={16}
              className="invert dark:invert-0"
            />
            Random
          </motion.button>
        </motion.form>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.48, duration: 0.45 }}
          
          className="mt-5 flex flex-wrap items-center justify-center gap-2 text-sm text-white"
        >
          <span className="mr-1">Try searching</span>
          {suggestions.map((suggestion) => (
            <motion.button
              key={suggestion}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={() => handleQueryChange(suggestion)}
              className="rounded-full border border-white/40 bg-zinc-950/35 px-3 py-1.5 text-white backdrop-blur-sm transition-colors hover:border-emerald-300 hover:bg-zinc-950/60 hover:text-emerald-200"
            >
              {suggestion}
            </motion.button>
          ))}
        </motion.div>

        {query.trim() && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            
            className="mt-8 p-4 text-left sm:p-5"
          >
            <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-white">
              Search results
            </div>

            {isLoading ? (
              <p className="rounded-2xl border border-white/20 bg-white/10 p-4 text-sm text-white shadow-lg shadow-black/10 backdrop-blur-xl">
                Loading bird data...
              </p>
            ) : results.length ? (
              <ul className="space-y-3">
                {results.map((bird) => (
                  <li key={bird.id}>
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSelectedBird(bird)}
                      className="w-full cursor-pointer rounded-2xl border border-white/25 bg-white/10 p-4 text-left shadow-lg shadow-black/10 backdrop-blur-xl transition-[background-color,border-color,box-shadow] hover:border-white/40 hover:bg-white/15 hover:shadow-xl hover:shadow-black/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
                    >
                      <div className="flex items-start gap-4">
                        <BirdResultImage bird={bird} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-lg font-semibold text-white">
                                {bird.name_en}
                              </p>
                              <p className="text-sm italic text-zinc-200">
                                {bird.scientific_name}
                              </p>
                            </div>
                            <span className="rounded-full border border-emerald-200/30 bg-emerald-300/15 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-emerald-100">
                              {bird.order}
                            </span>
                          </div>
                          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-zinc-200">
                            <span>{bird.family}</span>
                            <span className="h-1 w-1 rounded-full bg-white/60" />
                            <span>{bird.name_zh_hans}</span>
                          </div>
                        </div>
                      </div>
                    </motion.button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-2xl border border-white/20 bg-white/10 p-4 text-sm text-white shadow-lg shadow-black/10 backdrop-blur-xl">
                No bird matches found for “{query.trim()}”.
              </p>
            )}
          </motion.div>
        )}

        <p className="mt-8 text-center text-xs text-white/85">
          Bird data source: huashu-bird-sticker
        </p>
      </motion.section>
      {selectedBird && (
        <BirdDetailsModal
          key={selectedBird.id}
          bird={selectedBird}
          onClose={() => setSelectedBird(null)}
        />
      )}
    </main>
  );
}

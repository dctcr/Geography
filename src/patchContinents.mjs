import fs from "node:fs/promises";

const INPUT = "./config/countries.json";
const OUTPUT = "./config/countries.withContinents.json";

// Normalizer
function normalize(input) {
  return input
    .toLowerCase()
    .normalize("NFD") // split accents
    .replace(/\p{Diacritic}/gu, "") // remove accents
    .replace(/&/g, " and ")
    .replace(/[’'`.]/g, "") // apostrophes/periods/etc.
    .replace(/[^\p{L}\p{N}]+/gu, " ") // non letters/numbers -> spaces
    .replace(/\bst\b/g, "saint") // "st" -> "saint"
    .trim()
    .replace(/\s+/g, " "); // collapse whitespace
}

// Normalize
function continentSlug(displayName) {
  return normalize(displayName).replace(/\s+/g, "_"); // "North America" -> "north_america"
}

async function main() {
  const root = JSON.parse(await fs.readFile(INPUT, "utf8"));

  // Whether JSON is array or object keyed by country name
  const entries = Array.isArray(root) ? root : Object.values(root);

  // Pull minimal fields (required: specify fields on /all)
  const url =
    "https://restcountries.com/v3.1/all?fields=name,capital,continents,altSpellings";
  const res = await fetch(url);
  if (!res.ok)
    throw new Error(`REST Countries failed: ${res.status} ${res.statusText}`);
  const rc = await res.json();

  // Build lookup maps
  const byName = new Map();
  const byCapital = new Map();

  for (const c of rc) {
    const continents = c.continents ?? [];
    const names = [
      c?.name?.common,
      c?.name?.official,
      ...(c?.altSpellings ?? []),
    ].filter(Boolean);

    for (const n of names) byName.set(normalize(n), continents);

    for (const cap of c?.capital ?? []) if (cap) byCapital.set(normalize(cap), continents);
  }

  const unmatched = [];

  for (const entry of entries) {
    if (!entry || typeof entry !== "object") continue;

    const nameKey = normalize(entry.name);
    const capKey = normalize(entry.capital);

    // Try name first, then capital as fallback
    const continents = byName.get(nameKey) || byCapital.get(capKey);

    if (!continents || continents.length === 0) {
      unmatched.push({ name: entry.name, capital: entry.capital });
      continue;
    }

    // Display field
    entry.continent = continents.length === 1 ? continents[0] : continents.join(" / ");

    // Accepted input field
    entry.accepted ??= {};
    entry.accepted.continent = [...new Set(continents.map(continentSlug))];
  }

  await fs.writeFile(OUTPUT, JSON.stringify(root, null, 2) + "\n", "utf8");

  console.log(`Wrote: ${OUTPUT}`);
  console.log(`Unmatched: ${unmatched.length}`);
  if (unmatched.length) console.log(unmatched);
}

// Run automater + catch error if any
main().catch((e) => {
  console.error(e);
  process.exit(1); //break code
});
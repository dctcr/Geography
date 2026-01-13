const countries = require("./config/countries.json");

const difficultySettings = {
  easy: {
    count: 10,
    pool: ["easy"], // only easy countries
  },
  medium: {
    count: 25,
    pool: ["easy", "medium"], // easy + medium
  },
  hard: {
    count: 50,
    pool: ["easy", "medium", "hard"], // all
  },
  expert: {
    count: 100,
    pool: ["easy", "medium", "hard"], // all
  },
  worldwide: {
    count: null, // null = all available
    pool: ["easy", "medium", "hard"], // effectively all
  },
};

function normalizeAnswer(input) {
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

function getLabelForMode(country, mode) {
  if (mode === "capital") return country.capital;
  if (mode === "continent") return country.continent;
  return country.name;
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function findCountryByName(name) {
  const target = normalizeAnswer(name);
  return countries.find((c) => normalizeAnswer(c.name) === target);
}

/**
 * @param {Object} correctCountry   The country this question is about
 * @param {Object} options
 * @param {Array} options.pool      Array of country objects to draw distractors from
 * @param {string} options.mode     "country" || "capital" || "continent"
 * @param {number} options.optionCount How many total options {default: 4} 
 */
function buildMcqOptions(
  correctCountry, {
    pool, mode = "country", optionCount = 4
  } = {}
) {
  // Fallback pool: all countries
  const basePool = Array.isArray(pool) && pool.length ? pool : countries;

  // What text to put on each button
  const getLabel = (c) => {
    if (mode === "country") return c.name;
    if (mode === "capital") return c.capital;
    if (mode === "continent") return c.continent;
    return c.name;
  };

  // Start with the correct answer
  const options = [];
  const userIds = new Set();
  options.push({ label: getLabel(correctCountry), isCorrect: true});
  userIds.add(correctCountry.name); // using name as "unique" id

  // Try to pull "similar" countries by name (from dataset)
  const similarNames = correctCountry.similar || [];
  const similarCountries = [];

  for (const simName of similarNames) {
    const found = findCountryByName(simName);
    if (!found) continue;
    if (normalizeAnswer(found.name) === normalizeAnswer(correctCountry.name)) continue;

    const label = getLabel(found);
    if (!label) continue;

    const key = found.name;
    if (userIds.has(key)) continue;

    userIds.add(key);
    similarCountries.push({ label, isCorrect: false });
  }

  // Shuffle and take as many similar distractors as needed
  shuffle(similarCountries);
  for (const opt of similarCountries) {
    if (options.length >= optionCount) break;
    options.push(opt);
  }

  // If more distractors needed, fill from pool (same difficulty mix)
  if (options.length < optionCount) {
    const fillerCandidates = shuffle([...basePool].filter((c) => {
      const key = c.name;
      if (userIds.has(key)) return false;

      const label = getLabel(c);
      return Boolean(label);
    }));

    for (const c of fillerCandidates) {
      if (options.length >= optionCount) break;
      options.push({
        label: getLabel(c),
        isCorrect: false
      });
      userIds.add(c.name);
    }
  }

  // Final shuffle so correct answer isnt always at index 0
  return shuffle(options);
}

function getRandomCountriesByDifficulty(difficulty) {
  const settings = difficultySettings[difficulty] || difficultySettings.easy;
  const { count, pool } = settings;

  let poolCountries;

  if (difficulty === "worldwide") {
    // All countries, ignore difficulty field
    poolCountries = [...countries];
  } else {
    // Filter by allowed difficulty pool (e.g. ["easy", "medium"])
    poolCountries = countries.filter((c) => pool.includes(c.difficulty));
  }

  shuffle(poolCountries);

  if (!count) {
    // No count specified (worldwide) -> return all
    return poolCountries;
  }

  return poolCountries.slice(0, Math.min(count, poolCountries.length));
}

function withinOneTypo(a, b) {
  if (a === b) return true;

  // Don't fuzzy-match ultra-short answers
  if(Math.max(a.length, b.length) <= 3) return false;

  const la = a.length, lb = b.length;
  if(Math.abs(la - lb) > 1) return false;

  // Adjacent transposition check (e.g. "londno" vs "london")
  if (la === lb) {
    const diffs = [];
    for (let i = 0; i < la; i++) {
      if (a[i] !== b[i]) diffs.push(i);
      if (diffs.length > 2) break;
    }
    if (
      diffs.length === 2 &&
      diffs[1] === diffs[0] + 1 &&
      a[diffs[0]] === b[diffs[1]] &&
      a[diffs[1]] === b[diffs[0]]
    ) return true;
  }

  // One substitution (same length) "berkin" vs "berlin"
  if (la === lb) {
    let mismatches = 0;
    for (let i = 0; i < la; i++) {
      if (a[i] !== b[i] && ++mismatches > 1) return false;
    }
    return mismatches === 1;
  }

  // One insertion/deletion (length differs by 1) "berlins" or "berli" vs "berlin"
  const longer = la > lb ? a : b;
  const shorter = la > lb ? b : a;

  let i = 0, j = 0;
  let usedEdit = false;

  while (i < longer.length && j < shorter.length) {
    if (longer[i] === shorter[j]) {
      i++; j++;
      continue;
    }
    if (usedEdit) return false;
    usedEdit = true;
    i++; //skip one char in longer
  }

  //if edit never used, only diff is last char is longer
  return true;
}

// mode: "country" or "capital"
function checkAnswer(country, userInput, mode = "country") {
  const normalized = normalizeAnswer(userInput);

  const canonical = 
    mode === "capital" ? country.capital :
    mode === "country" ? country.name :
    mode === "continent" ? country.continent :
    null;
  
  const acceptedForMode = [
    ...(country.accepted?.[mode] ?? []),
    ...(canonical ? [canonical] : [])
  ];


  return acceptedForMode.some((acc) => {
    const accNorm = normalizeAnswer(acc);
    return accNorm === normalized || withinOneTypo(accNorm, normalized);
  });
}

module.exports = {
  difficultySettings,
  getRandomCountriesByDifficulty,
  checkAnswer,
  normalizeAnswer,
  buildMcqOptions
};

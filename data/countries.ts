export type Country = {
  country: string;
  code: string;
  flag: string;
};

export const COUNTRY_DATA_URL =
  "https://raw.githubusercontent.com/gedhiraj/Country/refs/heads/main/countries.json";

const FLAG_URL_PATTERN =
  /^https:\/\/twemoji\.maxcdn\.com\/2\/svg\/[0-9a-f-]+\.svg$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseCountry(value: unknown, index: number): Country {
  if (!isRecord(value)) {
    throw new Error(`Country entry ${index + 1} is not an object.`);
  }

  const { country, code, flag } = value;
  if (
    typeof country !== "string" ||
    !country.trim() ||
    typeof code !== "string" ||
    !/^[a-z]{2}(?:-[a-z]{3})?$/i.test(code) ||
    typeof flag !== "string" ||
    !FLAG_URL_PATTERN.test(flag)
  ) {
    throw new Error(`Country entry ${index + 1} has invalid fields.`);
  }

  return { country: country.trim(), code: code.toLowerCase(), flag };
}

export async function fetchCountries(): Promise<Country[]> {
  const response = await fetch(COUNTRY_DATA_URL);
  if (!response.ok) {
    throw new Error(`Country data request failed (${response.status}).`);
  }

  const data: unknown = await response.json();
  if (!Array.isArray(data)) {
    throw new Error("Country data must be a JSON array.");
  }

  const countries = data.map(parseCountry);
  if (countries.length < 10) {
    throw new Error("Country data contains too few entries to start a quiz.");
  }

  const codes = new Set(countries.map(({ code }) => code));
  if (codes.size !== countries.length) {
    throw new Error("Country data contains duplicate country codes.");
  }

  return countries;
}

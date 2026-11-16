/**
 * Mappls (MapmyIndia) reverse geocoding: GPS coordinates -> street, locality, city and PIN code.
 * Mappls' India map data is more precise than the free providers the website falls back to.
 *
 * Key: MAPPLS_API_KEY (Mappls Console -> API keys -> the static key from "credentials"). It stays on
 * this server; the website only calls GET /api/v1/geo/reverse. Without a key the lookup is off and
 * the website uses its free providers, as before.
 */

export interface ReverseGeocodeAddress {
  pincode?: string;
  city?: string;
  district?: string;
  state?: string;
  /** Sub-locality and locality, e.g. "Anna Nagar West, Anna Nagar" */
  area?: string;
  locality?: string;
  subLocality?: string;
  street?: string;
  houseNumber?: string;
  houseName?: string;
  poi?: string;
  formattedAddress?: string;
}

const SEARCH_URL = 'https://search.mappls.com/search/address/rev-geocode';
const GEOCODE_URL = 'https://search.mappls.com/search/address/geocode';
const AUTOSUGGEST_URL = 'https://search.mappls.com/search/places/autosuggest/json';
// Keys from the older Mappls console only work on the older address (key in the path)
const LEGACY_URL = (key: string) => `https://apis.mappls.com/advancedmaps/v1/${encodeURIComponent(key)}/rev_geocode`;
// Answers that mean "this key isn't for this address" rather than "the service is down"
const KEY_STATUSES = new Set([400, 401, 403, 404, 412]);

const TIMEOUT_MS = 6000;
const CACHE_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX = 5000;
// ~11 m: the same spot asked twice (prompt, then pickup page) costs one Mappls call
const cache = new Map<string, { at: number; value: ReverseGeocodeAddress }>();

export class MapplsError extends Error {
  constructor(public readonly status: number, message?: string) {
    super(message || `Mappls answered ${status}`);
    this.name = 'MapplsError';
  }
}

const text = (v: unknown): string | undefined => {
  const s = typeof v === 'string' ? v.trim() : '';
  return s && !/^unnamed/i.test(s) ? s : undefined;
};

const withoutDistrict = (v?: string) => v?.replace(/\s+district$/i, '') || undefined;

/** One Mappls result -> the address fields the website uses. */
export const toAddress = (r: any): ReverseGeocodeAddress => {
  const pin = String(r?.pincode ?? '').replace(/\D/g, '');
  const district = withoutDistrict(text(r?.district));
  const subLocality = text(r?.subLocality) || text(r?.subSubLocality);
  const locality = text(r?.locality) || text(r?.village);
  const city = text(r?.city) || text(r?.subDistrict) || district;
  const parts = [subLocality, locality].filter(
    (v, i, all): v is string => Boolean(v) && all.indexOf(v) === i && v !== city
  );
  return {
    pincode: pin.length === 6 ? pin : undefined,
    city,
    district,
    state: text(r?.state),
    area: parts.length ? parts.join(', ') : undefined,
    locality,
    subLocality,
    street: text(r?.street),
    houseNumber: text(r?.houseNumber),
    houseName: text(r?.houseName),
    poi: text(r?.poi),
    formattedAddress: text(r?.formatted_address),
  };
};

const fetchJson = async (url: string): Promise<any> => {
  const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (res.status === 204) return null;
  if (!res.ok) throw new MapplsError(res.status);
  const body: any = await res.json().catch(() => null);
  if (body?.responseCode && Number(body.responseCode) !== 200) throw new MapplsError(Number(body.responseCode));
  return body;
};

const fetchFirstResult = async (url: string): Promise<any | null> => {
  const body = await fetchJson(url);
  return Array.isArray(body?.results) && body.results.length ? body.results[0] : null;
};

export interface PincodePlace {
  city?: string;
  district?: string;
  subDistrict?: string;
  state?: string;
  /** Localities, sub-localities and villages Mappls knows inside this PIN code */
  areas: string[];
}

// Autosuggest types that name an area, not a shop or landmark
const AREA_TYPES = /locality|village|city|town|sub_?district/i;

export const MapplsGeocoder = {
  isConfigured: (): boolean => Boolean(process.env.MAPPLS_API_KEY?.trim()),

  /** Null when no key is set or Mappls has no address there. Throws when Mappls can't be reached. */
  async reverse(lat: number, lng: number): Promise<ReverseGeocodeAddress | null> {
    const key = process.env.MAPPLS_API_KEY?.trim();
    if (!key) return null;

    const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    const hit = cache.get(cacheKey);
    if (hit && Date.now() - hit.at < CACHE_MS) return hit.value;

    const query = `lat=${lat}&lng=${lng}`;
    let raw: any;
    try {
      raw = await fetchFirstResult(`${SEARCH_URL}?${query}&access_token=${encodeURIComponent(key)}`);
    } catch (err) {
      if (!(err instanceof MapplsError) || !KEY_STATUSES.has(err.status)) throw err;
      raw = await fetchFirstResult(`${LEGACY_URL(key)}?${query}`);
    }
    if (!raw) return null;

    const value = toAddress(raw);
    if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value as string);
    cache.set(cacheKey, { at: Date.now(), value });
    return value;
  },

  /**
   * A typed PIN code -> its city, taluk, district, state (Mappls geocoding) and the areas inside it
   * (Mappls autosuggest limited to that PIN code). Null without a key; throws when both calls fail.
   */
  async pincode(pin: string): Promise<PincodePlace | null> {
    const key = process.env.MAPPLS_API_KEY?.trim();
    if (!key || !/^\d{6}$/.test(pin)) return null;
    const token = `access_token=${encodeURIComponent(key)}`;

    const [geo, suggest] = await Promise.allSettled([
      fetchJson(`${GEOCODE_URL}?address=${pin}&podFilter=pincode&${token}`),
      fetchJson(`${AUTOSUGGEST_URL}?query=${pin}&filter=pin:${pin}&tokenizeAddress&${token}`),
    ]);
    if (geo.status === 'rejected' && suggest.status === 'rejected') throw geo.reason;

    const cop = geo.status === 'fulfilled' ? geo.value?.copResults : null;
    const first = Array.isArray(cop) ? cop[0] : cop;
    const samePin = first && String(first.pincode ?? '').replace(/\D/g, '') === pin;

    const areas: string[] = [];
    const add = (v: unknown) => {
      const name = text(v);
      if (name && !areas.some((a) => a.toLowerCase() === name.toLowerCase())) areas.push(name);
    };
    const places = suggest.status === 'fulfilled' && Array.isArray(suggest.value?.suggestedLocations) ? suggest.value.suggestedLocations : [];
    for (const p of places) {
      const t = p?.addressTokens || {};
      const tokenPin = String(t.pincode ?? '').replace(/\D/g, '');
      if (tokenPin && tokenPin !== pin) continue;
      add(t.subLocality);
      add(t.locality);
      add(t.village);
      if (AREA_TYPES.test(String(p?.type ?? ''))) add(p?.placeName);
    }
    if (samePin) {
      add(first.subLocality);
      add(first.locality);
      add(first.village);
    }

    return {
      city: samePin ? text(first.city) || text(first.subDistrict) : undefined,
      district: samePin ? withoutDistrict(text(first.district)) : undefined,
      subDistrict: samePin ? text(first.subDistrict) : undefined,
      state: samePin ? text(first.state) : undefined,
      areas,
    };
  },

  /** Tests only */
  clearCache: () => cache.clear(),
};

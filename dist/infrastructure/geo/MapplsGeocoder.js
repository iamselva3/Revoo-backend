"use strict";
/**
 * Mappls (MapmyIndia) reverse geocoding: GPS coordinates -> street, locality, city and PIN code.
 * Mappls' India map data is more precise than the free providers the website falls back to.
 *
 * Key: MAPPLS_API_KEY (Mappls Console -> API keys -> the static key from "credentials"). It stays on
 * this server; the website only calls GET /api/v1/geo/reverse. Without a key the lookup is off and
 * the website uses its free providers, as before.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MapplsGeocoder = exports.toAddress = exports.MapplsError = void 0;
const SEARCH_URL = 'https://search.mappls.com/search/address/rev-geocode';
// Keys from the older Mappls console only work on the older address (key in the path)
const LEGACY_URL = (key) => `https://apis.mappls.com/advancedmaps/v1/${encodeURIComponent(key)}/rev_geocode`;
// Answers that mean "this key isn't for this address" rather than "the service is down"
const KEY_STATUSES = new Set([400, 401, 403, 404, 412]);
const TIMEOUT_MS = 6000;
const CACHE_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX = 5000;
// ~11 m: the same spot asked twice (prompt, then pickup page) costs one Mappls call
const cache = new Map();
class MapplsError extends Error {
    status;
    constructor(status, message) {
        super(message || `Mappls answered ${status}`);
        this.status = status;
        this.name = 'MapplsError';
    }
}
exports.MapplsError = MapplsError;
const text = (v) => {
    const s = typeof v === 'string' ? v.trim() : '';
    return s && !/^unnamed/i.test(s) ? s : undefined;
};
const withoutDistrict = (v) => v?.replace(/\s+district$/i, '') || undefined;
/** One Mappls result -> the address fields the website uses. */
const toAddress = (r) => {
    const pin = String(r?.pincode ?? '').replace(/\D/g, '');
    const district = withoutDistrict(text(r?.district));
    const subLocality = text(r?.subLocality) || text(r?.subSubLocality);
    const locality = text(r?.locality) || text(r?.village);
    const city = text(r?.city) || text(r?.subDistrict) || district;
    const parts = [subLocality, locality].filter((v, i, all) => Boolean(v) && all.indexOf(v) === i && v !== city);
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
exports.toAddress = toAddress;
const fetchFirstResult = async (url) => {
    const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok)
        throw new MapplsError(res.status);
    const body = await res.json().catch(() => null);
    if (body?.responseCode && Number(body.responseCode) !== 200)
        throw new MapplsError(Number(body.responseCode));
    return Array.isArray(body?.results) && body.results.length ? body.results[0] : null;
};
exports.MapplsGeocoder = {
    isConfigured: () => Boolean(process.env.MAPPLS_API_KEY?.trim()),
    /** Null when no key is set or Mappls has no address there. Throws when Mappls can't be reached. */
    async reverse(lat, lng) {
        const key = process.env.MAPPLS_API_KEY?.trim();
        if (!key)
            return null;
        const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
        const hit = cache.get(cacheKey);
        if (hit && Date.now() - hit.at < CACHE_MS)
            return hit.value;
        const query = `lat=${lat}&lng=${lng}`;
        let raw;
        try {
            raw = await fetchFirstResult(`${SEARCH_URL}?${query}&access_token=${encodeURIComponent(key)}`);
        }
        catch (err) {
            if (!(err instanceof MapplsError) || !KEY_STATUSES.has(err.status))
                throw err;
            raw = await fetchFirstResult(`${LEGACY_URL(key)}?${query}`);
        }
        if (!raw)
            return null;
        const value = (0, exports.toAddress)(raw);
        if (cache.size >= CACHE_MAX)
            cache.delete(cache.keys().next().value);
        cache.set(cacheKey, { at: Date.now(), value });
        return value;
    },
    /** Tests only */
    clearCache: () => cache.clear(),
};
//# sourceMappingURL=MapplsGeocoder.js.map
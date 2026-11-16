"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PincodeDirectory = void 0;
/**
 * Everything we can tell about a typed PIN code: city, taluk (sub-district), district, state and the
 * areas inside it, so a customer who types "626125" can pick "Mamsapuram" instead of saving a bare
 * number. Mappls first (most precise), India Post's post-office list and our own table fill the gaps.
 */
const IndiaLocation_js_1 = require("../database/models/IndiaLocation.js");
const MapplsGeocoder_js_1 = require("./MapplsGeocoder.js");
const MAX_AREAS = 40;
const CACHE_MS = 7 * 24 * 60 * 60 * 1000; // areas in a PIN code rarely change
const CACHE_MAX = 3000;
const cache = new Map();
const clean = (v) => {
    const s = typeof v === 'string' ? v.trim() : '';
    return s && !/^(na|n\/a|null|-)$/i.test(s) ? s : undefined;
};
/** India Post's offices for a PIN code; empty when it doesn't answer in time. */
const postOffices = async (pin) => {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(5000),
    });
    if (!res.ok)
        return [];
    const json = await res.json().catch(() => null);
    return Array.isArray(json) && json[0]?.Status === 'Success' && Array.isArray(json[0].PostOffice) ? json[0].PostOffice : [];
};
exports.PincodeDirectory = {
    async details(pin) {
        if (!/^\d{6}$/.test(pin))
            return null;
        const hit = cache.get(pin);
        if (hit && Date.now() - hit.at < CACHE_MS)
            return hit.value;
        const [mapplsResult, postResult, dbResult] = await Promise.allSettled([
            MapplsGeocoder_js_1.MapplsGeocoder.pincode(pin),
            postOffices(pin),
            IndiaLocation_js_1.IndiaLocationModel.findOne({ pincode: pin }).lean(),
        ]);
        if (mapplsResult.status === 'rejected') {
            // Never log the request URL: it carries the key
            const err = mapplsResult.reason;
            console.warn(`[PincodeDirectory] Mappls lookup for ${pin} failed (${err instanceof MapplsGeocoder_js_1.MapplsError ? `status ${err.status}` : err?.name || 'error'})`);
        }
        const m = mapplsResult.status === 'fulfilled' ? mapplsResult.value : null;
        const offices = postResult.status === 'fulfilled' ? postResult.value : [];
        const db = dbResult.status === 'fulfilled' ? dbResult.value : null;
        const office = offices[0] || {};
        const areas = [];
        for (const name of [...(m?.areas || []), ...offices.map((o) => o?.Name)]) {
            const n = clean(name);
            if (n && !areas.some((a) => a.toLowerCase() === n.toLowerCase()))
                areas.push(n);
        }
        const mapplsUseful = Boolean(m && (m.city || m.areas.length));
        if (!mapplsUseful && !offices.length && !db)
            return null;
        const value = {
            pincode: pin,
            city: m?.city || clean(db?.city) || clean(office.Block) || clean(office.District),
            district: m?.district || clean(db?.district) || clean(office.District),
            subDistrict: m?.subDistrict || clean(office.Block),
            state: m?.state || clean(db?.state) || clean(office.State),
            areas: areas.slice(0, MAX_AREAS),
            sources: [
                ...(mapplsUseful ? ['mappls'] : []),
                ...(offices.length ? ['indiapost'] : []),
                ...(db ? ['database'] : []),
            ],
        };
        // A half answer (both online sources down) is not kept, so the next customer gets the full one
        if (mapplsUseful || offices.length) {
            if (cache.size >= CACHE_MAX)
                cache.delete(cache.keys().next().value);
            cache.set(pin, { at: Date.now(), value });
        }
        return value;
    },
    /** Tests only */
    clearCache: () => cache.clear(),
};
//# sourceMappingURL=PincodeDirectory.js.map
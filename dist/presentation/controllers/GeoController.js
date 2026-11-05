"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeoController = void 0;
const IndiaLocation_js_1 = require("../../infrastructure/database/models/IndiaLocation.js");
class GeoController {
    /**
     * GET /api/v1/geo/states
     * Return Indian States & Union Territories (filterable by prefix/search 'q')
     */
    static async getStates(req, res) {
        try {
            const q = (req.query.q || '').trim();
            let filter = {};
            if (q) {
                filter = { name: { $regex: `^${q}`, $options: 'i' } };
            }
            const states = await IndiaLocation_js_1.IndiaStateModel.find(filter).sort({ displayOrder: 1, name: 1 });
            // Fallback if not found by prefix, try contains
            if (states.length === 0 && q) {
                const fallbackStates = await IndiaLocation_js_1.IndiaStateModel.find({
                    name: { $regex: q, $options: 'i' },
                }).sort({ name: 1 });
                return res.status(200).json({ success: true, count: fallbackStates.length, data: fallbackStates });
            }
            return res.status(200).json({ success: true, count: states.length, data: states });
        }
        catch (err) {
            console.error('[GeoController] getStates error:', err);
            return res.status(500).json({ success: false, message: 'Failed to retrieve states' });
        }
    }
    /**
     * GET /api/v1/geo/cities
     * Search Indian cities with optional state filter and prefix query 'q'
     */
    static async getCities(req, res) {
        try {
            const q = (req.query.q || '').trim();
            const state = (req.query.state || '').trim();
            const filter = {};
            if (state) {
                filter.state = { $regex: `^${state}$`, $options: 'i' };
            }
            if (q) {
                filter.city = { $regex: q, $options: 'i' };
            }
            const cities = await IndiaLocation_js_1.IndiaLocationModel.find(filter)
                .sort({ isPopular: -1, city: 1 })
                .limit(40);
            return res.status(200).json({ success: true, count: cities.length, data: cities });
        }
        catch (err) {
            console.error('[GeoController] getCities error:', err);
            return res.status(500).json({ success: false, message: 'Failed to search cities' });
        }
    }
    /**
     * GET /api/v1/geo/pincode/:pincode
     * Lookup City & State by 6-digit Indian PIN code.
     * Checks MongoDB first. If not present, queries India Post Postal API and caches into MongoDB.
     */
    static async lookupPincode(req, res) {
        try {
            const pincode = (req.params.pincode || '').trim();
            if (!/^\d{6}$/.test(pincode)) {
                return res.status(400).json({ success: false, message: 'Invalid Indian PIN code format (must be 6 digits)' });
            }
            // 1. Check local MongoDB
            const localMatch = await IndiaLocation_js_1.IndiaLocationModel.findOne({ pincode });
            if (localMatch) {
                return res.status(200).json({
                    success: true,
                    source: 'database',
                    data: {
                        pincode: localMatch.pincode,
                        city: localMatch.city,
                        district: localMatch.district || localMatch.city,
                        state: localMatch.state,
                    },
                });
            }
            // 2. Query official India Postal Public API fallback
            try {
                const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`, {
                    headers: { 'Accept': 'application/json' },
                    signal: AbortSignal.timeout(4000),
                });
                if (response.ok) {
                    const json = await response.json();
                    if (Array.isArray(json) && json[0]?.Status === 'Success' && json[0]?.PostOffice?.length > 0) {
                        const po = json[0].PostOffice[0];
                        const city = po.District || po.Block || po.Circle || po.Name;
                        const district = po.District || city;
                        const state = po.State;
                        // Cache in MongoDB for instant subsequent lookups
                        const newDoc = await IndiaLocation_js_1.IndiaLocationModel.create({
                            pincode,
                            city,
                            district,
                            state,
                            isPopular: false,
                        });
                        return res.status(200).json({
                            success: true,
                            source: 'postal_api',
                            data: {
                                pincode: newDoc.pincode,
                                city: newDoc.city,
                                district: newDoc.district,
                                state: newDoc.state,
                            },
                        });
                    }
                }
            }
            catch (fetchErr) {
                console.warn(`[GeoController] Postal API fallback lookup failed for ${pincode}:`, fetchErr);
            }
            // Fallback: If not found in external API, check if any location starts with same 3-digit circle
            const circlePrefix = pincode.substring(0, 3);
            const circleMatch = await IndiaLocation_js_1.IndiaLocationModel.findOne({ pincode: { $regex: `^${circlePrefix}` } });
            if (circleMatch) {
                return res.status(200).json({
                    success: true,
                    source: 'circle_estimate',
                    data: {
                        pincode,
                        city: circleMatch.city,
                        district: circleMatch.district,
                        state: circleMatch.state,
                    },
                });
            }
            return res.status(404).json({ success: false, message: 'No location details found for this PIN code' });
        }
        catch (err) {
            console.error('[GeoController] lookupPincode error:', err);
            return res.status(500).json({ success: false, message: 'Server error while checking PIN code' });
        }
    }
}
exports.GeoController = GeoController;
//# sourceMappingURL=GeoController.js.map
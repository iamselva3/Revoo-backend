/**
 * Mappls reverse geocoding: field mapping, the older-console key fallback, the cache, and the
 * /geo/reverse route (no key, bad coordinates, Mappls down). No call leaves the machine.
 */
import request from 'supertest';
import app from '../../app.js';
import { MapplsGeocoder, toAddress } from './MapplsGeocoder.js';

const SAMPLE = {
  responseCode: 200,
  version: '270.191',
  results: [{
    houseNumber: '12', houseName: '', poi: 'Anna Nagar Tower Park', poi_dist: '120',
    street: '2nd Avenue', street_dist: '20', subSubLocality: '', subLocality: 'Anna Nagar West',
    locality: 'Anna Nagar', village: '', district: 'Chennai District', subDistrict: 'Aminjikarai',
    city: 'Chennai', state: 'Tamil Nadu', pincode: '600040', lat: '13.0878', lng: '80.2101', area: 'India',
    formatted_address: '12, 2nd Avenue, Anna Nagar West, Anna Nagar, Chennai, Tamil Nadu. Pin-600040 (India)',
  }],
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe('MapplsGeocoder', () => {
  const realKey = process.env.MAPPLS_API_KEY;
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    MapplsGeocoder.clearCache();
    process.env.MAPPLS_API_KEY = 'test-key';
    fetchMock = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchMock.mockRestore();
    if (realKey === undefined) delete process.env.MAPPLS_API_KEY;
    else process.env.MAPPLS_API_KEY = realKey;
  });

  it('maps a Mappls result to street, area, city, district, state and PIN code', () => {
    expect(toAddress(SAMPLE.results[0])).toEqual({
      pincode: '600040',
      city: 'Chennai',
      district: 'Chennai',
      state: 'Tamil Nadu',
      area: 'Anna Nagar West, Anna Nagar',
      locality: 'Anna Nagar',
      subLocality: 'Anna Nagar West',
      street: '2nd Avenue',
      houseNumber: '12',
      houseName: undefined,
      poi: 'Anna Nagar Tower Park',
      formattedAddress: SAMPLE.results[0].formatted_address,
    });
  });

  it('fills a village address: city from the sub-district, "Unnamed Road" dropped, bad PIN ignored', () => {
    const a = toAddress({ street: 'Unnamed Road', village: 'Watrap', subDistrict: 'Srivilliputhur', district: 'Virudhunagar District', state: 'Tamil Nadu', pincode: '6261' });
    expect(a).toMatchObject({ city: 'Srivilliputhur', district: 'Virudhunagar', area: 'Watrap', street: undefined, pincode: undefined });
  });

  it('asks Mappls with the key as access_token and caches the same spot', async () => {
    fetchMock.mockResolvedValue(json(SAMPLE));
    const a = await MapplsGeocoder.reverse(13.08781, 80.21012);
    const b = await MapplsGeocoder.reverse(13.08783, 80.21009); // same ~11 m cell
    expect(a?.pincode).toBe('600040');
    expect(b).toEqual(a);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url.startsWith('https://search.mappls.com/search/address/rev-geocode?')).toBe(true);
    expect(url).toContain('lat=13.08781&lng=80.21012');
    expect(url).toContain('access_token=test-key');
  });

  it('tries the older Mappls address when the key is refused there', async () => {
    fetchMock.mockResolvedValueOnce(json({ error: 'invalid token' }, 401)).mockResolvedValueOnce(json(SAMPLE));
    const a = await MapplsGeocoder.reverse(13.0878, 80.2101);
    expect(a?.area).toBe('Anna Nagar West, Anna Nagar');
    expect(String(fetchMock.mock.calls[1][0])).toBe('https://apis.mappls.com/advancedmaps/v1/test-key/rev_geocode?lat=13.0878&lng=80.2101');
  });

  it('does nothing without a key', async () => {
    delete process.env.MAPPLS_API_KEY;
    expect(MapplsGeocoder.isConfigured()).toBe(false);
    expect(await MapplsGeocoder.reverse(13.08, 80.27)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  describe('GET /api/v1/geo/reverse', () => {
    it('returns the Mappls address', async () => {
      fetchMock.mockResolvedValue(json(SAMPLE));
      const res = await request(app).get('/api/v1/geo/reverse?lat=13.0878&lng=80.2101');
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ success: true, source: 'mappls', data: { pincode: '600040', city: 'Chennai', area: 'Anna Nagar West, Anna Nagar' } });
    });

    it('answers data: null when no key is set, so the website uses its free providers', async () => {
      delete process.env.MAPPLS_API_KEY;
      const res = await request(app).get('/api/v1/geo/reverse?lat=13.0878&lng=80.2101');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, source: 'none', data: null });
    });

    it('answers data: null when Mappls is down, without exposing the key', async () => {
      fetchMock.mockRejectedValue(Object.assign(new Error('timeout'), { name: 'TimeoutError' }));
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      const res = await request(app).get('/api/v1/geo/reverse?lat=13.0878&lng=80.2101');
      expect(res.status).toBe(200);
      expect(res.body.data).toBeNull();
      expect(JSON.stringify(warn.mock.calls)).not.toContain('test-key');
      warn.mockRestore();
    });

    it('refuses missing or impossible coordinates', async () => {
      for (const q of ['', '?lat=13.08', '?lat=abc&lng=80.2', '?lat=95&lng=80.2', '?lat=13.08&lng=200']) {
        const res = await request(app).get('/api/v1/geo/reverse' + q);
        expect(res.status).toBe(400);
      }
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});

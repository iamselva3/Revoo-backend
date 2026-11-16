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

describe('typed PIN code -> areas', () => {
  const realKey = process.env.MAPPLS_API_KEY;
  let fetchMock: jest.SpyInstance;
  const GEOCODE = { copResults: { pincode: '626125', city: 'Srivilliputhur', district: 'Virudhunagar District', subDistrict: 'Srivilliputhur', state: 'Tamil Nadu', locality: '' } };
  const SUGGEST = {
    suggestedLocations: [
      { placeName: 'Mamsapuram', type: 'VILLAGE', addressTokens: { village: 'Mamsapuram', pincode: '626125' } },
      { placeName: 'Madavarvilagam', type: 'LOCALITY', addressTokens: { locality: 'Madavarvilagam', city: 'Srivilliputhur', pincode: '626125' } },
      { placeName: 'Sri Andal Temple', type: 'POI', addressTokens: { locality: 'Madavarvilagam', pincode: '626125' } },
      { placeName: 'Rajapalayam', type: 'CITY', addressTokens: { city: 'Rajapalayam', pincode: '626117' } },
    ],
  };
  const POST = [{ Status: 'Success', PostOffice: [
    { Name: 'Srivilliputhur', Block: 'Srivilliputhur', District: 'Virudhunagar', State: 'Tamil Nadu' },
    { Name: 'Mamsapuram', Block: 'Srivilliputhur', District: 'Virudhunagar', State: 'Tamil Nadu' },
    { Name: 'Pillaiyarnatham', Block: 'NA', District: 'Virudhunagar', State: 'Tamil Nadu' },
  ] }];

  const route = (opts: { mappls?: 'ok' | 'down'; post?: 'ok' | 'down' } = {}) =>
    fetchMock.mockImplementation((async (url: any) => {
      const u = String(url);
      if (u.includes('postalpincode.in')) return opts.post === 'down' ? Promise.reject(new Error('timeout')) : json(POST);
      if (opts.mappls === 'down') return json({ error: 'down' }, 503);
      if (u.includes('/address/geocode')) return json(GEOCODE);
      if (u.includes('/autosuggest/')) return json(SUGGEST);
      throw new Error('unexpected ' + u);
    }) as any);

  beforeEach(async () => {
    process.env.MAPPLS_API_KEY = 'test-key';
    fetchMock = jest.spyOn(global, 'fetch');
    const { PincodeDirectory } = await import('./PincodeDirectory.js');
    PincodeDirectory.clearCache();
    const { IndiaLocationModel } = await import('../database/models/IndiaLocation.js');
    jest.spyOn(IndiaLocationModel, 'findOne').mockReturnValue({ lean: () => Promise.resolve(null) } as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (realKey === undefined) delete process.env.MAPPLS_API_KEY;
    else process.env.MAPPLS_API_KEY = realKey;
  });

  it('Mappls: city, taluk, district and the areas inside the PIN code (no landmarks, no other PIN codes)', async () => {
    route();
    const place = await MapplsGeocoder.pincode('626125');
    expect(place).toEqual({ city: 'Srivilliputhur', district: 'Virudhunagar', subDistrict: 'Srivilliputhur', state: 'Tamil Nadu', areas: ['Mamsapuram', 'Madavarvilagam'] });
    const urls = fetchMock.mock.calls.map((c) => String(c[0]));
    expect(urls.some((u) => u.startsWith('https://search.mappls.com/search/address/geocode?address=626125&podFilter=pincode&access_token=test-key'))).toBe(true);
    expect(urls.some((u) => u.startsWith('https://search.mappls.com/search/places/autosuggest/json?query=626125&filter=pin:626125'))).toBe(true);
  });

  it('GET /geo/areas/:pincode: Mappls areas first, then post offices, no repeats', async () => {
    route();
    const res = await request(app).get('/api/v1/geo/areas/626125');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      pincode: '626125', city: 'Srivilliputhur', district: 'Virudhunagar', subDistrict: 'Srivilliputhur', state: 'Tamil Nadu',
      areas: ['Mamsapuram', 'Madavarvilagam', 'Srivilliputhur', 'Pillaiyarnatham'],
      sources: ['mappls', 'indiapost'],
    });
  });

  it('Mappls down: the post-office list still gives the areas', async () => {
    route({ mappls: 'down' });
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const res = await request(app).get('/api/v1/geo/areas/626125');
    expect(res.body.data).toMatchObject({ city: 'Srivilliputhur', district: 'Virudhunagar', subDistrict: 'Srivilliputhur', areas: ['Srivilliputhur', 'Mamsapuram', 'Pillaiyarnatham'], sources: ['indiapost'] });
    expect(JSON.stringify(warn.mock.calls)).not.toContain('test-key');
  });

  it('no key and India Post down: 404; bad PIN codes: 400', async () => {
    delete process.env.MAPPLS_API_KEY;
    route({ post: 'down' });
    expect((await request(app).get('/api/v1/geo/areas/626125')).status).toBe(404);
    expect((await request(app).get('/api/v1/geo/areas/62612')).status).toBe(400);
    expect((await request(app).get('/api/v1/geo/areas/abcdef')).status).toBe(400);
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAnalyticsSummary, getDenialReasons, getTopResources } from './analytics';
import { identityClient } from './client';
import type { AnalyticsQuery } from '../types/analytics';

vi.mock('./client', () => {
  const mockGet = vi.fn();
  const instance = {
    get: mockGet,
    post: vi.fn(),
    interceptors: {
      request: { use: vi.fn(), handlers: [] },
      response: { use: vi.fn(), handlers: [] },
    },
  };
  return {
    default: instance,
    identityClient: instance,
    apiClient: instance,
    resourceClient: instance,
    getAuthToken: vi.fn(),
    setAuthToken: vi.fn(),
    clearAuthToken: vi.fn(),
    getAuthExpiresAt: vi.fn(),
    setAuthExpiresAt: vi.fn(),
  };
});

/** Config object passed to identityClient.get on the most recent call. */
const lastGetConfig = () =>
  vi.mocked(identityClient.get).mock.calls.at(-1)?.[1] as
    { params?: Record<string, unknown>; signal?: AbortSignal } | undefined;

const SUMMARY_PAYLOAD = {
  startDate: '2026-10-01T00:00:00+00:00',
  endDate: '2026-10-31T23:59:59+00:00',
  totals: { requests: 6, approvals: 4, denials: 1, revocations: 1 },
  trend: [
    { date: '2026-10-01', requests: 3, approvals: 2, denials: 0, revocations: 1 },
    { date: '2026-10-02', requests: 3, approvals: 2, denials: 1, revocations: 0 },
  ],
};

const TOP_RESOURCES_PAYLOAD = {
  startDate: null,
  endDate: null,
  totalRequests: 6,
  items: [
    {
      rank: 1,
      resourceId: 'res-1',
      resourceName: 'prod-db-1',
      requestCount: 4,
      percentage: 66.67,
    },
    { rank: 2, resourceId: 'res-2', resourceName: null, requestCount: 2, percentage: 33.33 },
  ],
};

const DENIAL_REASONS_PAYLOAD = {
  startDate: null,
  endDate: null,
  totalDenials: 9,
  items: [
    { reason: 'INSUFFICIENT_ROLE_PERMISSIONS', count: 5, percentage: 55.56 },
    { reason: 'RESOURCE_NOT_IN_SCOPE', count: 4, percentage: 44.44 },
  ],
};

describe('analytics API client (BIS-402 endpoints)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ------------------------------------------------------- endpoint paths

  it('requests the summary endpoint', async () => {
    vi.mocked(identityClient.get).mockResolvedValueOnce({ data: SUMMARY_PAYLOAD });
    await getAnalyticsSummary();
    expect(identityClient.get).toHaveBeenCalledWith('/api/analytics/summary', expect.anything());
  });

  it('requests the top-resources endpoint', async () => {
    vi.mocked(identityClient.get).mockResolvedValueOnce({ data: TOP_RESOURCES_PAYLOAD });
    await getTopResources();
    expect(identityClient.get).toHaveBeenCalledWith(
      '/api/analytics/top-resources',
      expect.anything(),
    );
  });

  it('requests the denial-reasons endpoint', async () => {
    vi.mocked(identityClient.get).mockResolvedValueOnce({ data: DENIAL_REASONS_PAYLOAD });
    await getDenialReasons();
    expect(identityClient.get).toHaveBeenCalledWith(
      '/api/analytics/denial-reasons',
      expect.anything(),
    );
  });

  // --------------------------------------------------------- date handling

  it('sends no date parameters when no range is selected', async () => {
    vi.mocked(identityClient.get).mockResolvedValueOnce({ data: SUMMARY_PAYLOAD });
    await getAnalyticsSummary({});
    expect(lastGetConfig()?.params).toEqual({});
  });

  it('sends startDate when only a start is given', async () => {
    vi.mocked(identityClient.get).mockResolvedValueOnce({ data: SUMMARY_PAYLOAD });
    await getAnalyticsSummary({ startDate: '2026-10-01T00:00:00.000Z' });
    expect(lastGetConfig()?.params).toEqual({ startDate: '2026-10-01T00:00:00.000Z' });
  });

  it('sends endDate when only an end is given', async () => {
    vi.mocked(identityClient.get).mockResolvedValueOnce({ data: SUMMARY_PAYLOAD });
    await getAnalyticsSummary({ endDate: '2026-10-31T23:59:59.999Z' });
    expect(lastGetConfig()?.params).toEqual({ endDate: '2026-10-31T23:59:59.999Z' });
  });

  it('sends both bounds together', async () => {
    vi.mocked(identityClient.get).mockResolvedValueOnce({ data: TOP_RESOURCES_PAYLOAD });
    await getTopResources({
      startDate: '2026-10-01T00:00:00.000Z',
      endDate: '2026-10-31T23:59:59.999Z',
    });
    expect(lastGetConfig()?.params).toEqual({
      startDate: '2026-10-01T00:00:00.000Z',
      endDate: '2026-10-31T23:59:59.999Z',
    });
  });

  it('omits an empty-string bound instead of sending an invalid date', async () => {
    vi.mocked(identityClient.get).mockResolvedValueOnce({ data: DENIAL_REASONS_PAYLOAD });
    await getDenialReasons({ startDate: '', endDate: '' });
    expect(lastGetConfig()?.params).toEqual({});
  });

  it('passes the AbortSignal through to the request config', async () => {
    vi.mocked(identityClient.get).mockResolvedValueOnce({ data: SUMMARY_PAYLOAD });
    const controller = new AbortController();
    await getAnalyticsSummary({}, controller.signal);
    expect(lastGetConfig()?.signal).toBe(controller.signal);
  });
  // ------------------------------------------------------------ normalizing

  it('normalizes the summary payload into typed totals and trend points', async () => {
    vi.mocked(identityClient.get).mockResolvedValueOnce({ data: SUMMARY_PAYLOAD });
    const result = await getAnalyticsSummary();

    expect(result.totals).toEqual({
      requests: 6,
      approvals: 4,
      denials: 1,
      revocations: 1,
    });
    expect(result.trend).toHaveLength(2);
    expect(result.trend[0]).toEqual({
      date: '2026-10-01',
      requests: 3,
      approvals: 2,
      denials: 0,
      revocations: 1,
    });
  });

  it('normalizes top resources and preserves a null resource name', async () => {
    vi.mocked(identityClient.get).mockResolvedValueOnce({ data: TOP_RESOURCES_PAYLOAD });
    const result = await getTopResources();

    expect(result.totalRequests).toBe(6);
    expect(result.items[0].resourceName).toBe('prod-db-1');
    expect(result.items[0].percentage).toBeCloseTo(66.67);
    expect(result.items[1].resourceName).toBeNull();
    expect(result.items[1].resourceId).toBe('res-2');
  });

  it('normalizes denial reasons with their server-supplied percentages', async () => {
    vi.mocked(identityClient.get).mockResolvedValueOnce({ data: DENIAL_REASONS_PAYLOAD });
    const result = await getDenialReasons();

    expect(result.totalDenials).toBe(9);
    expect(result.items[0]).toEqual({
      reason: 'INSUFFICIENT_ROLE_PERMISSIONS',
      count: 5,
      percentage: 55.56,
    });
  });

  it('treats a valid zero-data response as zeros and empty collections', async () => {
    vi.mocked(identityClient.get).mockResolvedValueOnce({
      data: { startDate: null, endDate: null, totals: {}, trend: [] },
    });
    const result = await getAnalyticsSummary();

    expect(result.totals).toEqual({ requests: 0, approvals: 0, denials: 0, revocations: 0 });
    expect(result.trend).toEqual([]);
  });

  it('rejects a malformed payload instead of returning NaN values', async () => {
    vi.mocked(identityClient.get).mockResolvedValueOnce({
      data: { totals: { requests: 'many' }, trend: [] },
    });
    await expect(getAnalyticsSummary()).rejects.toThrow(/summary.totals.requests/);
  });

  it('rejects a non-array trend collection', async () => {
    vi.mocked(identityClient.get).mockResolvedValueOnce({
      data: { totals: {}, trend: 'nope' },
    });
    await expect(getAnalyticsSummary()).rejects.toThrow(/summary\.trend.*must be an array/);
  });

  it('normalizes a thrown transport failure into the shared error model', async () => {
    vi.mocked(identityClient.get).mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 503, data: {} },
      config: {},
      toJSON: () => ({}),
    });
    await expect(getTopResources()).rejects.toMatchObject({ kind: 'server' });
  });

  it('keeps the API query type contract available to callers', () => {
    const query: AnalyticsQuery = { startDate: '2026-10-01T00:00:00.000Z' };
    expect(query.startDate).toBe('2026-10-01T00:00:00.000Z');
  });
});

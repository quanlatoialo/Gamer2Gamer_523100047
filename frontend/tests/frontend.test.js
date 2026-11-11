import { formatEUR, formatDate, formatDateTime, timeAgo, getStatusBadge } from '../src/lib/utils';
import { getCsrfToken, apiRequest } from '../src/lib/api';

describe('Frontend UI & Utilities Test Suite', () => {
  describe('1. Currency & Financial Formatting', () => {
    test('TC-FE01: Returns fallback 0,00 € for null or undefined', () => {
      expect(formatEUR(null)).toBe('0,00 €');
      expect(formatEUR(undefined)).toBe('0,00 €');
    });

    test('TC-FE02: Correctly converts cents to Euro currency format', () => {
      const formatted = formatEUR(2500); // 25.00 EUR
      expect(formatted).toContain('25');
      expect(formatted).toContain('€');
    });

    test('TC-FE03: Formats small cents and large balances correctly', () => {
      expect(formatEUR(50)).toContain('0,50');
      expect(formatEUR(1000000)).toContain('10.000');
    });
  });

  describe('2. Date & Time Localization Helpers', () => {
    test('TC-FE04: formatDate returns placeholder when date is null or empty', () => {
      expect(formatDate(null)).toBe('—');
      expect(formatDate('')).toBe('—');
    });

    test('TC-FE05: formatDate & formatDateTime formats valid ISO strings', () => {
      const result = formatDate('2026-05-20T10:30:00Z');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(5);

      const dt = formatDateTime('2026-05-20T10:30:00Z');
      expect(dt).toBe(result);
    });

    test('TC-FE06: timeAgo returns human-readable relative time for recent events', () => {
      expect(timeAgo(null)).toBe('');
      const now = new Date().toISOString();
      expect(timeAgo(now)).toBe('vừa xong');

      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      expect(timeAgo(tenMinutesAgo)).toBe('10 phút trước');

      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      expect(timeAgo(twoHoursAgo)).toBe('2 giờ trước');

      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      expect(timeAgo(threeDaysAgo)).toBe('3 ngày trước');
    });
  });

  describe('3. Escrow & Order Status Badge Mapping', () => {
    test('TC-FE07: Correctly maps funded escrow status', () => {
      const badge = getStatusBadge('funded');
      expect(badge.label).toBe('Đã giữ tiền (Ký quỹ)');
      expect(badge.color).toContain('text-blue-400');
    });

    test('TC-FE08: Correctly maps in_progress status', () => {
      const badge = getStatusBadge('in_progress');
      expect(badge.label).toBe('Đang thực hiện');
      expect(badge.color).toContain('text-purple-400');
    });

    test('TC-FE09: Correctly maps awaiting customer confirmation', () => {
      const badge = getStatusBadge('awaiting_customer_confirmation');
      expect(badge.label).toBe('Đã bàn giao (Chờ người mua xác nhận)');
      expect(badge.color).toContain('text-cyan-400');
    });

    test('TC-FE10: Correctly maps completed order status', () => {
      const badge = getStatusBadge('completed');
      expect(badge.label).toBe('Hoàn tất & Đã giải ngân');
      expect(badge.color).toContain('text-emerald-400');
    });

    test('TC-FE11: Correctly maps disputed order status', () => {
      const badge = getStatusBadge('disputed');
      expect(badge.label).toBe('Đang khiếu nại');
      expect(badge.color).toContain('text-red-400');
    });

    test('TC-FE12: Correctly maps refunded order status', () => {
      const badge = getStatusBadge('refunded');
      expect(badge.label).toBe('Đã hoàn tiền');
      expect(badge.color).toContain('text-amber-400');
    });

    test('TC-FE13: Fallback safely for undefined or custom status', () => {
      const badge = getStatusBadge('custom_unknown_status');
      expect(badge.label).toBe('custom unknown status');
      expect(badge.color).toContain('text-gray-400');
    });
  });

  describe('4. API Client & Security Headers', () => {
    beforeEach(() => {
      global.fetch = jest.fn();
    });

    test('TC-FE14: Injects CSRF token on POST/PUT requests', async () => {
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ csrfToken: 'mock-csrf-token-123' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ success: true }),
        });

      const res = await apiRequest('/api/orders/test-id/release', {
        method: 'POST',
        body: JSON.stringify({ action: 'confirm' }),
      });

      expect(res).toEqual({ success: true });
      expect(global.fetch).toHaveBeenCalledTimes(2);
      const callOptions = global.fetch.mock.calls[1][1];
      expect(callOptions.headers['x-csrf-token']).toBe('mock-csrf-token-123');
      expect(callOptions.headers['Content-Type']).toBe('application/json');
    });

    test('TC-FE15: Handles API errors with response status code', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ error: { message: 'Invalid payload', code: 'INVALID_INPUT' } }),
      });

      await expect(apiRequest('/api/test')).rejects.toThrow('Invalid payload');
    });
  });
});

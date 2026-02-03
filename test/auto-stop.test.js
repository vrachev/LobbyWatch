import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Test the auto-stop URL detection logic
// These tests focus on the pure logic without requiring browser globals

describe('Auto-stop URL Detection', () => {
  describe('isOnGamePage detection logic', () => {
    // Test the pure pathname checking logic
    const isOnGamePage = (pathname) => pathname.startsWith('/game/');

    it('returns true for /game/ path', () => {
      expect(isOnGamePage('/game/abc123')).toBe(true);
    });

    it('returns true for /game/ with complex ID', () => {
      expect(isOnGamePage('/game/abc-123-def-456')).toBe(true);
    });

    it('returns false for root path', () => {
      expect(isOnGamePage('/')).toBe(false);
    });

    it('returns false for empty path', () => {
      expect(isOnGamePage('')).toBe(false);
    });

    it('returns false for /games/ path (similar but different)', () => {
      expect(isOnGamePage('/games/')).toBe(false);
    });

    it('returns false for /gameplay/ path', () => {
      expect(isOnGamePage('/gameplay/')).toBe(false);
    });

    it('returns false for /lobby path', () => {
      expect(isOnGamePage('/lobby')).toBe(false);
    });

    it('returns false for /game without trailing slash', () => {
      expect(isOnGamePage('/game')).toBe(false);
    });

    it('returns true for deeply nested game path', () => {
      expect(isOnGamePage('/game/abc/def/ghi')).toBe(true);
    });
  });

  describe('URL polling behavior', () => {
    it('should detect game page after pathname changes', () => {
      let currentPathname = '/';
      const isOnGamePage = () => currentPathname.startsWith('/game/');

      expect(isOnGamePage()).toBe(false);

      // Simulate navigation to game page
      currentPathname = '/game/test123';

      expect(isOnGamePage()).toBe(true);
    });
  });

  describe('History API interception pattern', () => {
    it('should call handler when intercepting function is called', () => {
      const handler = vi.fn();

      // Simulate intercepted pushState
      const originalFn = vi.fn();
      const interceptedFn = function(...args) {
        originalFn.apply(this, args);
        handler();
      };

      interceptedFn({}, '', '/game/test');
      expect(handler).toHaveBeenCalledTimes(1);
      expect(originalFn).toHaveBeenCalledTimes(1);
    });

    it('should preserve original function behavior', () => {
      const originalFn = vi.fn().mockReturnValue('result');
      const handler = vi.fn();

      const interceptedFn = function(...args) {
        const result = originalFn.apply(this, args);
        handler();
        return result;
      };

      const result = interceptedFn('arg1', 'arg2');

      expect(originalFn).toHaveBeenCalledWith('arg1', 'arg2');
      expect(handler).toHaveBeenCalled();
    });
  });

  describe('Monitoring state management', () => {
    it('stopMonitoring should clear URL polling interval', () => {
      vi.useFakeTimers();

      let urlCheckInterval = null;

      // Start URL polling
      urlCheckInterval = setInterval(() => {}, 500);
      expect(urlCheckInterval).not.toBeNull();

      // Stop URL polling
      const stopUrlPolling = () => {
        if (urlCheckInterval) {
          clearInterval(urlCheckInterval);
          urlCheckInterval = null;
        }
      };

      stopUrlPolling();
      expect(urlCheckInterval).toBeNull();

      vi.useRealTimers();
    });

    it('should not stop monitoring when not on game page', () => {
      let currentPathname = '/';
      let isMonitoring = true;
      const isOnGamePage = () => currentPathname.startsWith('/game/');

      const handleUrlChange = () => {
        if (isOnGamePage() && isMonitoring) {
          isMonitoring = false;
        }
      };

      handleUrlChange();
      expect(isMonitoring).toBe(true);
    });

    it('should stop monitoring when on game page', () => {
      let currentPathname = '/game/abc123';
      let isMonitoring = true;
      const isOnGamePage = () => currentPathname.startsWith('/game/');

      const handleUrlChange = () => {
        if (isOnGamePage() && isMonitoring) {
          isMonitoring = false;
        }
      };

      handleUrlChange();
      expect(isMonitoring).toBe(false);
    });

    it('should not crash if monitoring is already stopped', () => {
      let currentPathname = '/game/abc123';
      let isMonitoring = false;
      const isOnGamePage = () => currentPathname.startsWith('/game/');

      const handleUrlChange = () => {
        if (isOnGamePage() && isMonitoring) {
          isMonitoring = false;
        }
      };

      // Should not throw
      expect(() => handleUrlChange()).not.toThrow();
      expect(isMonitoring).toBe(false);
    });

    it('should handle rapid url changes correctly', () => {
      let currentPathname = '/';
      let isMonitoring = true;
      let stopCount = 0;
      const isOnGamePage = () => currentPathname.startsWith('/game/');

      const handleUrlChange = () => {
        if (isOnGamePage() && isMonitoring) {
          isMonitoring = false;
          stopCount++;
        }
      };

      // Simulate rapid changes
      currentPathname = '/game/1';
      handleUrlChange(); // Should stop
      currentPathname = '/';
      handleUrlChange(); // Should not stop (already stopped)
      currentPathname = '/game/2';
      handleUrlChange(); // Should not stop (already stopped)

      expect(stopCount).toBe(1);
      expect(isMonitoring).toBe(false);
    });
  });

  describe('Integration: URL change detection flow', () => {
    it('simulates full auto-stop flow', () => {
      vi.useFakeTimers();

      let currentPathname = '/';
      let isMonitoring = true;
      let pollingInterval = null;
      let urlCheckInterval = null;

      const isOnGamePage = () => currentPathname.startsWith('/game/');

      const stopPolling = () => {
        if (pollingInterval) {
          clearInterval(pollingInterval);
          pollingInterval = null;
        }
        if (urlCheckInterval) {
          clearInterval(urlCheckInterval);
          urlCheckInterval = null;
        }
      };

      const stopMonitoring = () => {
        if (!isMonitoring) return;
        isMonitoring = false;
        stopPolling();
      };

      // Start monitoring
      pollingInterval = setInterval(() => {}, 2000);
      urlCheckInterval = setInterval(() => {
        if (isOnGamePage() && isMonitoring) {
          stopMonitoring();
        }
      }, 500);

      expect(isMonitoring).toBe(true);
      expect(pollingInterval).not.toBeNull();
      expect(urlCheckInterval).not.toBeNull();

      // Simulate navigation to game page
      currentPathname = '/game/abc123';

      // Advance timer to trigger URL check
      vi.advanceTimersByTime(500);

      expect(isMonitoring).toBe(false);
      expect(pollingInterval).toBeNull();
      expect(urlCheckInterval).toBeNull();

      vi.useRealTimers();
    });
  });
});

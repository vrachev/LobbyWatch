import { describe, it, expect, vi, beforeEach } from 'vitest';
import '../src/notifications.js';
const { shouldDismissNotification, getGamesToDismiss } = globalThis.OFP_NOTIFICATIONS;

const NOTIFICATION_TIMEOUT_MS = 60000;

describe('Notification Dismissal', () => {
  describe('shouldDismissNotification', () => {
    it('dismisses when notification has timed out', () => {
      const now = Date.now();
      const createdAt = now - 61000;

      const result = shouldDismissNotification({
        createdAt,
        lobby: { gameID: 'test', numClients: 50, msUntilStart: 30000, gameConfig: { maxPlayers: 100 } },
        timeoutMs: NOTIFICATION_TIMEOUT_MS,
        now
      });

      expect(result.shouldDismiss).toBe(true);
      expect(result.reason).toBe('Notification timeout (60s)');
    });

    it('does not dismiss before timeout', () => {
      const now = Date.now();
      const createdAt = now - 59000;

      const result = shouldDismissNotification({
        createdAt,
        lobby: { gameID: 'test', numClients: 50, msUntilStart: 30000, gameConfig: { maxPlayers: 100 } },
        timeoutMs: NOTIFICATION_TIMEOUT_MS,
        now
      });

      expect(result.shouldDismiss).toBe(false);
    });

    it('does not dismiss at exactly timeout boundary', () => {
      const now = Date.now();
      const createdAt = now - 60000; // Exactly 60 seconds ago

      const result = shouldDismissNotification({
        createdAt,
        lobby: { gameID: 'test', numClients: 50, msUntilStart: 30000, gameConfig: { maxPlayers: 100 } },
        timeoutMs: NOTIFICATION_TIMEOUT_MS,
        now
      });

      expect(result.shouldDismiss).toBe(false);
    });

    it('dismisses when createdAt is missing', () => {
      const now = Date.now();

      const result = shouldDismissNotification({
        createdAt: undefined,
        lobby: { gameID: 'test', numClients: 50, msUntilStart: 30000, gameConfig: { maxPlayers: 100 } },
        timeoutMs: NOTIFICATION_TIMEOUT_MS,
        now
      });

      expect(result.shouldDismiss).toBe(true);
      expect(result.reason).toBe('Invalid notification data (missing createdAt)');
    });

    it('dismisses when game disappears from lobby', () => {
      const now = Date.now();
      const createdAt = now;

      const result = shouldDismissNotification({
        createdAt,
        lobby: null, // Game disappeared
        timeoutMs: NOTIFICATION_TIMEOUT_MS,
        now
      });

      expect(result.shouldDismiss).toBe(true);
      expect(result.reason).toBe('Game no longer in lobby');
    });

    it('dismisses when game starts (msUntilStart = 0)', () => {
      const now = Date.now();

      const result = shouldDismissNotification({
        createdAt: now,
        lobby: { gameID: 'test', numClients: 80, msUntilStart: 0, gameConfig: { maxPlayers: 100 } },
        timeoutMs: NOTIFICATION_TIMEOUT_MS,
        now
      });

      expect(result.shouldDismiss).toBe(true);
      expect(result.reason).toBe('Game started');
    });

    it('dismisses when game starts (msUntilStart negative)', () => {
      const now = Date.now();

      const result = shouldDismissNotification({
        createdAt: now,
        lobby: { gameID: 'test', numClients: 80, msUntilStart: -5000, gameConfig: { maxPlayers: 100 } },
        timeoutMs: NOTIFICATION_TIMEOUT_MS,
        now
      });

      expect(result.shouldDismiss).toBe(true);
      expect(result.reason).toBe('Game started');
    });

    it('dismisses when game is full', () => {
      const now = Date.now();

      const result = shouldDismissNotification({
        createdAt: now,
        lobby: { gameID: 'test', numClients: 100, msUntilStart: 30000, gameConfig: { maxPlayers: 100 } },
        timeoutMs: NOTIFICATION_TIMEOUT_MS,
        now
      });

      expect(result.shouldDismiss).toBe(true);
      expect(result.reason).toBe('Game full');
    });

    it('does not dismiss when game is still available', () => {
      const now = Date.now();

      const result = shouldDismissNotification({
        createdAt: now,
        lobby: { gameID: 'test', numClients: 50, msUntilStart: 30000, gameConfig: { maxPlayers: 100 } },
        timeoutMs: NOTIFICATION_TIMEOUT_MS,
        now
      });

      expect(result.shouldDismiss).toBe(false);
      expect(result.reason).toBe('');
    });

    it('handles missing gameConfig gracefully (defaults maxPlayers to Infinity)', () => {
      const now = Date.now();

      const result = shouldDismissNotification({
        createdAt: now,
        lobby: { gameID: 'test', numClients: 50, msUntilStart: 30000 },
        timeoutMs: NOTIFICATION_TIMEOUT_MS,
        now
      });

      expect(result.shouldDismiss).toBe(false);
    });

    it('prioritizes timeout over other dismissal reasons', () => {
      const now = Date.now();
      const createdAt = now - 70000;

      // Lobby that would trigger multiple dismiss reasons
      const result = shouldDismissNotification({
        createdAt,
        lobby: { gameID: 'test', numClients: 100, msUntilStart: 0, gameConfig: { maxPlayers: 100 } },
        timeoutMs: NOTIFICATION_TIMEOUT_MS,
        now
      });

      expect(result.shouldDismiss).toBe(true);
      expect(result.reason).toBe('Notification timeout (60s)');
    });
  });

  describe('getGamesToDismiss', () => {
    it('returns empty array when no games are tracked', () => {
      const notifiedGameIds = new Map();
      const lobbies = [{ gameID: 'test', numClients: 50, msUntilStart: 30000, gameConfig: { maxPlayers: 100 } }];

      const result = getGamesToDismiss(notifiedGameIds, lobbies, NOTIFICATION_TIMEOUT_MS);

      expect(result).toEqual([]);
    });

    it('returns games to dismiss based on lobby state', () => {
      const now = Date.now();
      const notifiedGameIds = new Map([
        ['game-1', { notificationId: 'notif-1', createdAt: now }],
        ['game-2', { notificationId: 'notif-2', createdAt: now }],
        ['game-3', { notificationId: 'notif-3', createdAt: now }]
      ]);

      const lobbies = [
        { gameID: 'game-1', numClients: 50, msUntilStart: 30000, gameConfig: { maxPlayers: 100 } }, // Still available
        { gameID: 'game-2', numClients: 100, msUntilStart: 30000, gameConfig: { maxPlayers: 100 } } // Full
        // game-3 is missing (disappeared)
      ];

      const result = getGamesToDismiss(notifiedGameIds, lobbies, NOTIFICATION_TIMEOUT_MS, now);

      expect(result).toHaveLength(2);
      expect(result.find(r => r.gameID === 'game-2')?.reason).toBe('Game full');
      expect(result.find(r => r.gameID === 'game-3')?.reason).toBe('Game no longer in lobby');
      expect(result.find(r => r.gameID === 'game-1')).toBeUndefined();
    });

    it('handles null lobbies array (treats as empty)', () => {
      const now = Date.now();
      const notifiedGameIds = new Map([
        ['game-1', { notificationId: 'notif-1', createdAt: now }]
      ]);

      const result = getGamesToDismiss(notifiedGameIds, null, NOTIFICATION_TIMEOUT_MS, now);

      expect(result).toHaveLength(1);
      expect(result[0].reason).toBe('Game no longer in lobby');
    });

    it('handles undefined lobbies array (treats as empty)', () => {
      const now = Date.now();
      const notifiedGameIds = new Map([
        ['game-1', { notificationId: 'notif-1', createdAt: now }]
      ]);

      const result = getGamesToDismiss(notifiedGameIds, undefined, NOTIFICATION_TIMEOUT_MS, now);

      expect(result).toHaveLength(1);
      expect(result[0].reason).toBe('Game no longer in lobby');
    });

    it('includes notification data in results', () => {
      const now = Date.now();
      const notificationData = { notificationId: 'notif-123', createdAt: now };
      const notifiedGameIds = new Map([['game-1', notificationData]]);

      const lobbies = []; // Game disappeared

      const result = getGamesToDismiss(notifiedGameIds, lobbies, NOTIFICATION_TIMEOUT_MS, now);

      expect(result[0].notificationData).toBe(notificationData);
      expect(result[0].gameID).toBe('game-1');
    });
  });
});


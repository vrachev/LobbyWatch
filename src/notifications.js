function shouldDismissNotification({ createdAt, lobby, timeoutMs, now = Date.now() }) {
  if (createdAt === undefined || createdAt === null) {
    return { shouldDismiss: true, reason: 'Invalid notification data (missing createdAt)' };
  }

  const age = now - createdAt;
  if (age > timeoutMs) {
    return { shouldDismiss: true, reason: 'Notification timeout (60s)' };
  }

  if (!lobby) {
    return { shouldDismiss: true, reason: 'Game no longer in lobby' };
  }

  if (lobby.msUntilStart <= 0) {
    return { shouldDismiss: true, reason: 'Game started' };
  }

  const maxPlayers = lobby.gameConfig?.maxPlayers || Infinity;
  if (lobby.numClients >= maxPlayers) {
    return { shouldDismiss: true, reason: 'Game full' };
  }

  return { shouldDismiss: false, reason: '' };
}

function getGamesToDismiss(notifiedGameIds, lobbies, timeoutMs, now = Date.now()) {
  if (notifiedGameIds.size === 0) return [];

  const lobbyMap = new Map(lobbies?.map(l => [l.gameID, l]) || []);
  const toDismiss = [];

  for (const [gameID, notificationData] of notifiedGameIds.entries()) {
    try {
      const lobby = lobbyMap.get(gameID);
      const result = shouldDismissNotification({
        createdAt: notificationData?.createdAt,
        lobby,
        timeoutMs,
        now
      });

      if (result.shouldDismiss) {
        toDismiss.push({ gameID, notificationData, reason: result.reason });
      }
    } catch (error) {
      console.error(`[OFP] Error processing notification for ${gameID}:`, error);
      toDismiss.push({ gameID, notificationData: notificationData || {}, reason: 'Error processing notification' });
    }
  }

  return toDismiss;
}

if (typeof globalThis !== 'undefined') {
  globalThis.OFP_NOTIFICATIONS = {
    shouldDismissNotification,
    getGamesToDismiss
  };
}

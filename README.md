# LobbyWatch

A Chrome extension that monitors openfront.io for games matching your criteria and sends notifications when a match is found.

## Installation

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked" and select this folder

## Enabling Notifications

When a matching game is found, LobbyWatch will ask for permission to send notifications. **Click "Allow"** when you see this prompt.

### If Notifications Aren't Working

1. **Check Chrome's notification settings:**
   - Go to `chrome://settings/content/notifications`
   - Make sure "Sites can ask to send notifications" is enabled
   - Check that `https://openfront.io` is not in the "Not allowed" list

2. **Check site-specific settings:**
   - Visit openfront.io
   - Click the lock icon in the address bar
   - Click "Site settings"
   - Set "Notifications" to "Allow"

3. **Check your system settings:**
   - **macOS:** System Settings > Notifications > Chrome must be enabled
   - **Windows:** Settings > System > Notifications > Chrome must be on

4. **Re-enable the extension:**
   - Go to `chrome://extensions`
   - Toggle LobbyWatch off and back on
   - Refresh the openfront.io page

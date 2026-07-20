import type { LocaleMeta } from '../types'

// B-017/D-054: every UI string lives here, keyed by component/section. This
// is the source-of-truth dict — every other locale is a Partial<Dict> of the
// same keys, so a translation can lag behind new keys without breaking the
// build; t() falls back to English per missing key. `{name}` placeholders
// are substituted by `t()`.
export const meta: LocaleMeta = { code: 'en', nativeName: 'English' }

export const dict = {
  // format.ts
  'format.minutesAgo': '{minutes} min ago',
  'format.hoursAgo': '{hours} h ago',
  'format.daysAgo': '{days} d ago',
  'format.startedMinutesAgo': 'Started {minutes} min ago',
  'format.startedHoursAgo': 'Started {hours} h ago',
  'format.startedDaysAgo': 'Started {days} d ago',
  'format.startedOn': 'Started {date}',
  'format.views': '{count} views',
  'format.subscribers': '{count} subscribers',

  // HelpOverlay
  'help.title': 'Keyboard shortcuts',
  'help.section.feed': 'Feed',
  'help.section.player': 'Player (the video currently open)',
  'help.section.miniplayer': 'Miniplayer (while docked)',
  'help.action.nextPrev': 'next / previous video',
  'help.action.play': 'play (opens the player view)',
  'help.action.openByUrl': 'open a video by URL',
  'help.action.openInBrowser': 'open in browser',
  'help.action.toggleReadUnread': 'toggle read / unread',
  'help.action.ignore': 'ignore (undo with u)',
  'help.action.ignorePlayer': 'ignore (closes/docks the player)',
  'help.action.undoIgnore': 'undo last ignore',
  'help.action.toggleFavorite': 'toggle favorite',
  'help.action.toggleWatchLater': 'toggle watch later',
  'help.action.markAllRead': 'mark all as read (current view)',
  'help.action.toggleLayout': 'toggle grid / list view',
  'help.action.topEnd': 'top / end of loaded feed',
  'help.action.switchView': 'switch view (All, Unread, WL, Fav, Ignored)',
  'help.action.reload': 'reload from local data',
  'help.action.filter': 'filter in view',
  'help.action.findChannel': 'find channel (sidebar)',
  'help.action.toggleSidebar': 'show/hide sidebar',
  'help.action.playPause': 'play / pause',
  'help.action.seek': 'seek ±5s',
  'help.action.toggleLike': 'toggle like',
  'help.action.toggleSubscribe': 'subscribe / unsubscribe from the channel',
  'help.action.toggleComments': 'show / hide comments',
  'help.action.nextInQueue': 'next in queue (when one is queued)',
  'help.action.extractWindow': 'pop out into its own always-on-top window',
  'help.action.maximizeMiniplayer': 'back to the full player',
  'help.action.closeMiniplayer': 'close',
  'help.action.thisOverlay': 'this overlay',
  'help.action.backClose': 'back / close',

  // Titlebar
  'titlebar.minimize': 'Minimize',
  'titlebar.maximizeRestore': 'Maximize / restore',
  'titlebar.close': 'Close',

  // UrlPrompt
  'urlPrompt.title': 'Open a YouTube video',
  'urlPrompt.placeholder': 'https://www.youtube.com/watch?v=…',
  'urlPrompt.notice.shorts':
    'That is a Shorts link — Chronicle never plays Shorts. Opening in the browser…',
  'urlPrompt.notice.channelOrPlaylist': 'Channels and playlists open in the browser for now.',
  'urlPrompt.notice.invalid': 'That does not look like a YouTube video URL.',

  // ConnectPanel
  'connect.readError': 'Could not read the file.',
  'connect.title': 'Connect Chronicle to your YouTube account',
  'connect.intro.part1':
    'Chronicle ships with no credentials: you bring your own Google Cloud project, so your data and API quota belong to you alone. The one-time setup takes about ten minutes — see',
  'connect.intro.part2':
    'in the repository for the step-by-step guide to creating the project and downloading your',
  'connect.intro.part3': '.',
  'connect.step1.title': 'Import your OAuth client',
  'connect.step1.detailDone': 'client_secret.json imported.',
  'connect.step1.detailPending':
    'Select the client_secret.json you downloaded from your Google Cloud console (Desktop app type).',
  'connect.step1.buttonDone': 'Replace file…',
  'connect.step1.button': 'Select client_secret.json…',
  'connect.step2.title': 'Authorize in your browser',
  'connect.step2.detail':
    'Your default browser opens Google’s consent screen; Chronicle listens locally (127.0.0.1) for the answer. Tokens never leave this machine.',
  'connect.step2.buttonConnecting': 'Waiting for the browser…',
  'connect.step2.button': 'Connect Google',
  'connect.storageWarning':
    'Heads-up: no OS keychain was detected, so your token will be stored with reversible local encryption — anyone with access to your user account could read it. (D-013 fallback.)',

  // SettingsView
  'settings.language.heading': 'Language',
  'settings.language.label': 'Language',
  'settings.language.system': 'Follow system',
  'settings.connection.heading': 'Connection',
  'settings.connection.stateConnected': 'Connected to your Google account.',
  'settings.connection.stateDisconnected': 'API key imported, but not connected.',
  'settings.connection.stateUnconfigured': 'No API key imported yet.',
  'settings.connection.scopeGrantedPrefix': 'Granted scope:',
  'settings.connection.scopeName.readonly': 'YouTube read-only',
  'settings.connection.scopeName.readonlyPlusWrite': 'YouTube read-only + subscribe/comment/like',
  'settings.connection.scopeGrantedSuffix.readonly':
    '— used to list your subscriptions and fetch video metadata. Subscribing, commenting, and liking are also available from inside the app; the first time you use one, Chronicle will ask for this additional permission.',
  'settings.connection.scopeGrantedSuffix.readonlyPlusWrite':
    "— used to list your subscriptions, fetch video metadata, and act on your behalf only for actions you take yourself (subscribe/unsubscribe, comment, like). Chronicle's own read/watch/favorite states stay local either way, never written to YouTube (D-003).",
  'settings.connection.revokeLink': 'Revoke anytime ↗',
  'settings.connection.keychainOk': 'Your key and token are stored in your system keychain.',
  'settings.connection.keychainFallback':
    'No OS keychain detected: your token is stored with reversible local encryption — anyone with access to your user account can read it (D-013 fallback).',
  'settings.connection.playerSessionNote':
    "The embedded player uses its own separate browser session, distinct from the Google connection above — sign in there if playback ever shows YouTube's \"Sign in to confirm you're not a bot\" wall. This is also where YouTube Premium's ad-free playback would apply, if you're signed into Premium.",
  'settings.connection.signInToYouTubeButton': 'Sign in to YouTube',
  // Names the account explicitly — this action only ever touches the
  // primary account, which is otherwise ambiguous now that multiple
  // accounts can exist.
  'settings.connection.reconnectButton': 'Reconnect "{account}"',
  'settings.connection.replaceKeyButton': 'Replace API key',
  'settings.connection.fixWeeklyLogoutButton': 'Fix weekly logout',
  'settings.connection.signOutButton': 'Sign out',
  'settings.sync.heading': 'Sync',
  'settings.sync.backgroundRefresh': 'Background refresh',
  'settings.sync.every15': 'Every 15 minutes',
  'settings.sync.every30': 'Every 30 minutes',
  'settings.sync.everyHour': 'Every hour',
  'settings.sync.manualOnly': 'Manual only',
  'settings.sync.note':
    'Every refresh also re-checks your subscription list, so a new subscription shows up on the very next sync — nothing to do here.',
  'settings.sync.checkForUpdates': 'Check for updates',
  'settings.sync.checkForUpdatesNote':
    'Chronicle {version} — checks GitHub for a newer release, at most once a day. Never downloads or installs anything on its own; you decide from the release page.',
  'settings.playback.heading': 'Playback',
  'settings.playback.defaultSpeed': 'Default speed',
  'settings.playback.speedNormal': 'Normal',
  'settings.playback.note':
    "The player opens already set to this speed. You can still change it per video from the embed's own controls — that never changes this default.",
  'settings.appearance.heading': 'Appearance',
  'settings.appearance.theme': 'Theme',
  'settings.appearance.themeSystem': 'Follow system',
  'settings.appearance.themeDark': 'Dark',
  'settings.appearance.themeLight': 'Light',
  'settings.appearance.showViewCounts': 'Show view counts',
  'settings.appearance.showShorts': 'Show Shorts',
  'settings.startup.heading': 'Startup & Background',
  'settings.startup.autoStart': 'Start Chronicle automatically when you log in',
  'settings.startup.backgroundMode': 'Keep running in the background when the window is closed',
  'settings.startup.backgroundModeNote':
    'A tray icon lets you reopen Chronicle or quit it for good; closing the window just hides it. This also lets sync (and notifications, if enabled below) keep going without the window open.',
  'settings.startup.popOutOnClose': 'Pop out the video when closing the window',
  'settings.startup.popOutOnCloseNote':
    'If a video is playing, closing the window pops it into the always-on-top floating player (same as pressing p) instead of leaving it playing silently behind the tray icon — closing that floating player then actually stops it. Turn this off and closing the window pauses the video instead.',
  'settings.startup.startMinimized': 'Start minimized to tray (don’t open the window)',
  'settings.startup.startMinimizedNote':
    'Opening Chronicle yourself always shows the window — this only applies to the automatic launch at login.',
  'settings.notifications.heading': 'Notifications',
  'settings.notifications.enabled': 'Notify me about new videos',
  'settings.notifications.backgroundModeHint':
    'Notifications only fire while Chronicle is running. Turn on "Run in background" above to keep them going after you close the window.',
  'settings.notifications.scope': 'Notify me about',
  'settings.notifications.scopeAll': 'All channels',
  'settings.notifications.scopeSelected': 'Selected channels',
  'settings.notifications.scopeSelectedHint':
    'Toggle notifications per channel from the icon next to it in the sidebar, or from its channel page.',
  'settings.notifications.notifyShorts': 'Notify me about new Shorts',
  'settings.notifications.notifyShortsNote':
    'Off means Shorts still show up in your feed, but never trigger a notification — handy for channels that post them often. Shorts hidden from the feed above never notify either way.',
  'settings.notifications.autoFavorite': 'Automatically notify for channels I favorite',
  'settings.notifications.autoFavoriteNote':
    "Favoriting a channel turns notifications on for it; unfavoriting turns them back off — unless you change that channel's notification state yourself afterward, which is always respected.",
  'settings.notifications.autoFavoriteDisableConfirm':
    'Also turn off notifications for your currently-favorited channels?',
  'settings.notifications.autoFavoriteDisableKeep': 'Leave as-is',
  'settings.notifications.autoFavoriteDisableClear': 'Turn off for favorites',
  'settings.data.heading': 'Data',
  'settings.data.note':
    'Everything Chronicle knows lives on this computer. The export is a single documented JSON file (see FORMAT.md in the repository) — you can leave with everything, anytime. The SQLite file itself is also a legitimate backup.',
  'settings.data.exportButton': 'Export data…',
  'settings.data.deleteConfirmButton': 'Click again to wipe the database and your key',
  'settings.data.deleteButton': 'Delete all local data',
  'settings.data.exportedBanner': 'Exported {videos} videos and {states} states to {path}',
  'settings.data.exportFailedBanner': 'Export failed: {message}',

  // Wizard — shared chrome
  'wizard.exitButton': '✕ Close',
  'wizard.screenshot.placeholder':
    'Screenshot pending capture — the text on the left is the full guidance.',
  'wizard.screenshot.verifiedOn': 'verified on {date}',
  'wizard.nav.back': '← Back',
  'wizard.nav.next': 'Next →',
  'wizard.copyRow.copy': 'Copy',
  'wizard.copyRow.copied': 'Copied ✓',

  // Wizard — WelcomeStep
  'wizard.welcome.heading':
    'Chronicle doesn’t have a server or an API key. You’ll create your own.',
  'wizard.welcome.intro.pre': 'It is free, takes about',
  'wizard.welcome.intro.strong': '10 minutes, one time only',
  'wizard.welcome.intro.post': ', and it means your data and your access belong to you alone:',
  'wizard.welcome.bullet.quota': 'Your own API quota — shared with nobody.',
  'wizard.welcome.bullet.noThirdParty':
    'No third party in the loop — Chronicle’s developers never touch your account.',
  'wizard.welcome.bullet.revocable': 'Revocable by you, anytime, in your own Google console.',
  'wizard.welcome.dim': 'You’ll need a Google account. No billing account is required.',
  'wizard.welcome.startButton': 'Let’s set it up',
  'wizard.welcome.quickPathButton': 'I’ve done this before — just import my key',

  // Wizard — ConsoleStep (shared)
  'wizard.step.heading': 'Step {label} — {title}',
  'wizard.step.variationsSummary': 'Something looks different?',

  // Wizard — ConsoleStep: project
  'wizard.step.project.title': 'Create a Google Cloud project',
  'wizard.step.project.why':
    'Google groups API access into “projects”. You need one to hold your own key — it is free, and no billing account is required for the YouTube API’s default quota.',
  'wizard.step.project.urlLabel': 'Open the project creation page',
  'wizard.step.project.copyLabel': 'Suggested project name',
  'wizard.step.project.confirmLabel': 'I created the project.',
  'wizard.step.project.variations':
    'If Google asks for an organization, choose “No organization”. If you already have projects, the page may open a picker first — use “New project”.',

  // Wizard — ConsoleStep: enable-api
  'wizard.step.enableApi.title': 'Enable the YouTube Data API v3',
  'wizard.step.enableApi.why':
    'Projects start with every API disabled; you are turning on just the one Chronicle needs — your subscriptions, video metadata, and (only when you choose to subscribe, comment, or like something) those actions too.',
  'wizard.step.enableApi.urlLabel': 'Open the YouTube Data API page',
  'wizard.step.enableApi.confirmLabel': 'I clicked Enable.',
  'wizard.step.enableApi.variations':
    'Make sure your new project is selected in the blue top bar before clicking Enable. If the button reads “Manage”, the API is already enabled — you are done here.',

  // Wizard — ConsoleStep: consent
  'wizard.step.consent.title': 'Configure the OAuth consent screen',
  'wizard.step.consent.why':
    'This is the permission screen you will see when connecting. Because it is your own project, you are both the developer and the only user.',
  'wizard.step.consent.urlLabel': 'Open the consent screen settings',
  'wizard.step.consent.copyLabel': 'Suggested app name',
  'wizard.step.consent.confirmLabel':
    'I configured the consent screen (External, my email in both contact fields).',
  'wizard.step.consent.variations':
    'User type: External (Internal only exists for Workspace organizations). No logo and no scopes need to be added — Chronicle requests its read-only scope at connect time. Skip every optional section. Google occasionally renames this page “Audience” / “Branding” inside “Google Auth Platform”.',

  // Wizard — ConsoleStep: test-user
  'wizard.step.testUser.title': 'Add yourself as a Test user',
  'wizard.step.testUser.why':
    'While the project is in “Testing” mode, only listed test users can sign in — that is you.',
  'wizard.step.testUser.urlLabel': 'Open the consent screen (Test users section)',
  'wizard.step.testUser.confirmLabel': 'I added my email as a Test user.',
  'wizard.step.testUser.variations':
    'In the newer “Google Auth Platform” layout the list lives under Audience → Test users. Use exactly the Google account you will connect with.',
  'wizard.step.testUser.emailLabel': 'Which Google account will you use?',
  'wizard.step.testUser.emailPlaceholder': 'you@gmail.com',
  'wizard.step.testUser.copyEmailLabel': 'Copy it for the Test users list',
  'wizard.step.testUser.emailNote': 'Stored only on this machine, only for this wizard.',

  // Wizard — ConsoleStep: publish
  'wizard.step.publish.title': 'Publish the app (recommended)',
  'wizard.step.publish.why':
    'In Testing mode, Google expires your connection every 7 days. Clicking “Publish app” makes your token permanent. You may see an “unverified app” warning when connecting — that is expected: the “unverified developer” is you.',
  'wizard.step.publish.urlLabel': 'Open the consent screen (Publish app)',
  'wizard.step.publish.variations':
    'Publishing with only the read-only YouTube scope does not require Google’s verification review. If you skip this, Chronicle will detect the weekly expiry and offer a two-click reconnect — plus a link back to this step.',
  'wizard.step.publish.publishedButton': 'I published it',
  'wizard.step.publish.skipButton': 'Skip — I accept reconnecting weekly',

  // Wizard — ConsoleStep: client
  'wizard.step.client.title': 'Create a Desktop OAuth client',
  'wizard.step.client.why':
    'This creates the actual key file Chronicle will use — it identifies your Chronicle install to your project.',
  'wizard.step.client.urlLabel': 'Open the credentials page',
  'wizard.step.client.copyLabel': 'Suggested client name',
  'wizard.step.client.confirmLabel': 'I created the Desktop client and downloaded the JSON file.',
  'wizard.step.client.variations':
    'Create credentials → OAuth client ID → Application type must be “Desktop app” (not “Web application”). The download is usually named client_secret_… .json and lands in your Downloads folder.',

  // Wizard — ImportStep / FileDrop
  'wizard.import.heading': 'Step 6 — Import your key file',
  'wizard.import.why.part1': 'Select the',
  'wizard.import.why.part2':
    'you downloaded. Chronicle extracts the key into your system keychain — it never leaves this machine and never touches a server.',
  'wizard.import.drop.part1': 'Drop',
  'wizard.import.drop.part2': 'here, or click to pick it',
  'wizard.import.backToClientStep': '← Back to Step 5 (create a Desktop client)',
  'wizard.import.okMessage':
    '✓ Key imported — Chronicle stores it in your system keychain, never online.',
  'wizard.import.okNote':
    'You may delete the downloaded file now if you wish; Chronicle never touches your files.',
  'wizard.import.storageWarning':
    'No OS keychain was detected, so the key is stored with reversible local encryption — anyone with access to your user account could read it.',

  // Wizard — ConnectStep
  'wizard.connect.heading': 'Step 7 — Connect to Google',
  'wizard.connect.why':
    'Your browser will open Google’s consent screen. Chronicle listens locally (127.0.0.1) for the answer — tokens never leave this machine.',
  'wizard.connect.warningTitle': 'Heads-up: the “unverified app” warning.',
  'wizard.connect.warning.part1': 'Google may show',
  'wizard.connect.warning.quote': '“Google hasn’t verified this app”',
  'wizard.connect.warning.part2': '. That is expected — the unverified developer is',
  'wizard.connect.warning.you': 'you',
  'wizard.connect.warning.part3': '. Click',
  'wizard.connect.warning.advanced': 'Advanced',
  'wizard.connect.warning.goUnsafe': 'Go to Chronicle (unsafe)',
  'wizard.connect.warning.part4': '. It is safe here because you are trusting your own project.',
  'wizard.connect.button': 'Connect Google',
  'wizard.connect.buttonWaiting': 'Waiting for the browser…',
  'wizard.connect.apiNotEnabledError': 'The YouTube Data API is not enabled in your project.',
  'wizard.connect.testUserHint':
    'If Google blocked the sign-in, the usual cause is a missing Test user (Step 4) while the project is in Testing mode.',
  'wizard.connect.fixItButton': '← Fix it in Step {step}',
  'wizard.connect.connectedPlain': '✓ Connected.',
  'wizard.connect.connectedAs': '✓ Connected as {name}.',
  // Chronicle starts importing subscriptions in the background the moment
  // this connects — no separate "first sync" step to wait through.
  'wizard.connect.closingNote':
    'Everything Chronicle knows is stored on this computer. Your key can be revoked anytime at myaccount.google.com/permissions.',
  'wizard.connect.openChronicleButton': 'Open Chronicle →',

  // App — feed buckets
  'app.bucket.today': 'Today',
  'app.bucket.yesterday': 'Yesterday',
  'app.bucket.thisWeek': 'This Week',
  'app.bucket.earlier': 'Earlier',
  'app.bucket.favoriteChannels': 'From your favorite channels',

  // App — banners
  'app.banner.connectionFailed': 'Connection failed: {message}',
  'app.banner.reconnectRequired':
    'Reconnect to Google — your authorization expired. (Testing-mode projects expire weekly; publishing the app fixes this permanently.)',
  'app.banner.reconnectAction': 'Reconnect',
  'app.banner.offline': 'You appear to be offline — showing local data. Refresh will retry.',
  'app.banner.refreshFailed': 'Refresh failed: {message}',
  'app.banner.openVideoFailed': 'Could not open the video: {message}',
  'app.banner.refreshAllFailed':
    "Refresh couldn't reach any channel ({count} failed) — check your connection. Will retry next cycle.",
  'app.banner.showDetails': 'Details',
  'app.banner.hideDetails': 'Hide details',
  'app.banner.showDetailsTitle': 'Show which channels failed and why',
  'app.banner.failureAccountLevel': 'Account-level',
  'app.banner.quotaExceeded':
    'Daily API limit reached — it resets at {time} your time. Chronicle keeps working from local data; discovery via RSS continues free.',
  'app.banner.signedOut': 'Signed out. Local data was kept — reconnect anytime.',
  'app.banner.updateAvailable': 'Chronicle {version} is available.',
  'app.banner.updateAction': 'View release',
  'app.banner.dismissTitle': 'Dismiss',
  'app.banner.newVideos': '{count} new video{plural}',
  'app.banner.unsubscribeFailed': "Couldn't unsubscribe: {message}",
  'app.banner.searchFailed': 'Search failed: {message}',
  'app.banner.subscribeFailed': "Couldn't subscribe: {message}",
  'app.banner.accountConnectFailed': "Couldn't connect the account: {message}",
  'app.banner.accountSyncFailed': "Couldn't sync this account: {message}",
  'app.banner.removeAccountFailed': "Couldn't remove this account: {message}",
  'app.writeScopeDialog.body':
    'Chronicle needs an extra one-time permission from Google for this action (like, subscribe, or comment). Continuing opens your browser to grant it.',
  'app.writeScopeDialog.cancel': 'Not now',
  'app.writeScopeDialog.continue': 'Continue to Google',

  // App — sidebar
  'app.sidebar.showTitle': 'Show sidebar',

  // App — topbar
  'app.topbar.refreshTitle': 'Refresh (r)',
  'app.topbar.channelFallback': 'Channel',
  'app.topbar.markAllRead': 'Mark all as read (M)',
  'app.topbar.searchYouTubePlaceholder': 'Search',
  'app.topbar.clearFilterTitle': 'Clear',
  'app.topbar.itemSizeTitle': 'Item size: {size}',
  'app.topbar.switchToListView': 'Switch to list view (v)',
  'app.topbar.switchToGridView': 'Switch to grid view (v)',
  'app.topbar.unsubscribe': 'Unsubscribe',
  'app.topbar.confirmUnsubscribe': 'Click again to unsubscribe',
  'app.topbar.openChannelTitle': "Open this channel's YouTube page",
  'app.topbar.favoriteChannelTitle': 'Favorite — prioritize at the top of the main feed',
  'app.topbar.unfavoriteChannelTitle': 'Unfavorite',

  // App — status text
  // "Identifying," not "filtering" — Shorts are shown, badged, not excluded
  // (see feed.md §Shorts / D-035); this phase only confirms which already-
  // visible videos get the badge.
  'app.status.filteringShorts': 'identifying Shorts — {checked} of {total} checked…',
  'app.status.checkingChannels': 'checking {checked} of {total} channels…',
  'app.status.refreshing': 'refreshing…',
  'app.status.caughtUp': 'All caught up',
  'app.status.lastRefreshSuffix': ' · last refresh {time}',
  'app.status.unreadCount': '{count} unread',
  // Tooltip copy behind the (i) icon shown next to the status text while a
  // sync is running — one line, in plain language, explaining what that
  // phase is actually doing (B-105).
  'app.status.checkingChannelsInfo':
    "Checking each subscribed channel's uploads for videos published since the last sync.",
  'app.status.filteringShortsInfo':
    'Confirming which of the newly found videos are YouTube Shorts.',
  'app.status.refreshingInfo':
    'Re-listing your subscriptions, then checking every channel for new videos.',

  // App — feed
  'app.feed.emptyFiltered': 'Nothing matches the filter.',
  'app.feed.emptyNoVideos': 'Nothing here yet.',

  // FeedList — shared between list rows and grid cards
  'feed.card.undoLabel': 'Ignored — it will leave this view',
  'feed.card.undoButton': 'Undo (u)',
  'feed.card.favoriteTitle': 'Favorite',
  'feed.card.watchLaterTitle': 'Watch Later',
  'feed.card.toggleReadTitle': 'Toggle read (m)',
  'feed.card.ignoreTitle': 'Ignore (i)',
  'feed.card.toggleFavoriteTitle': 'Toggle favorite (f)',
  'feed.card.toggleWatchLaterTitle': 'Toggle watch later (w)',
  'feed.card.openInBrowserTitle': 'Open in browser (b)',
  'feed.card.shortBadge': 'Short',
  'feed.card.liveBadge': 'Live',
  'feed.card.premiereBadge': 'Premiere',
  'feed.card.upcomingBadge': 'Upcoming',
  'feed.loadingMore': 'Loading more…',

  // PlayerView
  'player.topbar.back': '← Back',
  'player.topbar.backToFeed': '← Back to feed',
  'player.miniplayer.maximizeTitle': 'Back to full player (e)',
  'player.miniplayer.closeTitle': 'Close (x)',
  'player.extractTitle': 'Pop out into its own always-on-top window (p)',
  'player.miniplayer.resizeTitle': 'Drag to resize',
  'player.overlay.back': 'Back (Esc)',
  'player.overlay.embedBlockedTitle': 'This channel disabled embedded playback.',
  'player.overlay.openInBrowser': 'Open in browser',
  'player.action.markRead': 'Mark read (m)',
  'player.action.markUnread': 'Mark unread (m)',
  'player.action.favorite': '☆ Favorite (f)',
  'player.action.favorited': '★ Favorited (f)',
  'player.action.watchLater': 'Watch later (w)',
  'player.action.inWatchLater': 'In Watch Later (w)',
  'player.action.subscribe': 'Subscribe (s)',
  'player.action.subscribed': 'Subscribed (s)',
  'player.action.ignore': 'Ignore (i)',
  'player.action.openInBrowser': 'Open in browser (b)',
  'player.action.like': 'Like (l)',
  'player.action.liked': 'Liked (l)',
  'player.description.showMore': 'Show more',
  'player.description.showLess': 'Show less',
  'player.description.shortsLinkTitle': 'Shorts open in the browser (Chronicle never plays Shorts)',

  // Sidebar
  'sidebar.collapseTitle': 'Collapse sidebar',
  'sidebar.view.all': 'All',
  'sidebar.view.unread': 'Unread',
  'sidebar.view.watchLater': 'Watch Later',
  'sidebar.view.favorites': 'Favorites',
  'sidebar.view.ignored': 'Ignored',
  'sidebar.channelsHeader': 'Channels',
  'sidebar.findChannelPlaceholder': 'Find channel  c',
  'sidebar.clearTitle': 'Clear',
  'sidebar.noChannelMatch': 'No channel matches.',
  'sidebar.noChannels': 'This account isn’t following any channels yet.',
  'sidebar.settingsLabel': 'Settings',

  // Sidebar — Accounts (B-003)
  'sidebar.accountsHeader': 'Accounts',
  'sidebar.accountDisconnected': 'Reconnect needed',
  'sidebar.addAccount': '+ Add account',
  'sidebar.accountMenu.title': 'More',
  'sidebar.accountMenu.syncNow': 'Sync now',
  'sidebar.accountMenu.remove': 'Remove account',
  'sidebar.accountMenu.confirmRemove': 'Click again to remove',
  'sidebar.accountMenu.removeDisabledTitle':
    'The primary account can’t be removed here — use Sign Out in Settings instead',
  'sidebar.channelMenu.title': 'More',
  'sidebar.channelMenu.unsubscribe': 'Unsubscribe',
  'sidebar.channelMenu.confirmUnsubscribe': 'Click again to confirm',
  'sidebar.channelMenu.favorite': 'Favorite — prioritize at the top of the main feed',
  'sidebar.channelMenu.unfavorite': 'Unfavorite',
  'sidebar.channelMenu.notify': 'Notify me about new videos from this channel',
  'sidebar.channelMenu.unnotify': 'Stop notifying me about this channel',

  // YouTube search (B-009)
  'search.empty': 'No results.',
  'search.searching': 'Searching all of YouTube…',
  'search.subscribeButton': 'Subscribe',
  'search.subscribedButton': 'Subscribed',
  'search.videoChannelPrefix': 'on',
  'search.loadingMore': 'Loading more results…',

  // Comments (B-006)
  'comments.show': 'Show comments (c)',
  'comments.hide': 'Hide comments (c)',
  'comments.loading': 'Loading comments…',
  'comments.loadingMore': 'Loading more comments…',
  'comments.empty': 'No comments yet.',
  'comments.reconnectRequired':
    'Your connection needs renewing — reconnect from Settings to see comments.',
  'comments.addPlaceholder': 'Add a comment…',
  'comments.replyPlaceholder': 'Write a reply…',
  'comments.postButton': 'Post',
  'comments.posting': 'Posting…',
  'comments.replyButton': 'Reply',

  // Add another account (B-003) — no Google-console walkthrough, unlike
  // the first-run wizard: the OAuth client is already set up and shared.
  'addAccount.title': 'Add another Google account',
  'addAccount.instructions':
    'Add the new account’s email as a Test user on your existing Google Cloud project (the same one from your first setup), then connect it below.',
  'addAccount.openTestUsersLink': 'Open Test users settings',
  'addAccount.connectButton': 'Connect Google account',
  'addAccount.connecting': 'Waiting for the browser…',
  'addAccount.cancelButton': 'Cancel'
} as const

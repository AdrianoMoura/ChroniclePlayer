import type { Dict, LocaleMeta } from '../types'

// D-072: AI-generated translation, not yet reviewed by a native speaker — it
// may contain mistakes or awkward phrasing. If you speak German, a
// correction or a full review is a welcome contribution: this is a plain
// Partial<Dict>, so missing/wrong keys don't break anything — t() falls
// back to English for any key missing here. `{name}`-style placeholders
// must stay exactly as in en.ts; only the surrounding text should change.
export const meta: LocaleMeta = { code: 'de', nativeName: 'Deutsch', reviewed: false }

export const dict: Partial<Dict> = {
  // format.ts
  'format.minutesAgo': 'vor {minutes} Min.',
  'format.hoursAgo': 'vor {hours} Std.',
  'format.daysAgo': 'vor {days} Tagen',
  'format.startedMinutesAgo': 'Begann vor {minutes} Min.',
  'format.startedHoursAgo': 'Begann vor {hours} Std.',
  'format.startedDaysAgo': 'Begann vor {days} Tagen',
  'format.startedOn': 'Begann am {date}',
  'format.views': '{count} Aufrufe',
  'format.subscribers': '{count} Abonnenten',

  // HelpOverlay
  'help.title': 'Tastenkürzel',
  'help.section.feed': 'Feed',
  'help.section.player': 'Player (das aktuell geöffnete Video)',
  'help.section.miniplayer': 'Miniplayer (im angedockten Zustand)',
  'help.action.nextPrev': 'nächstes / vorheriges Video',
  'help.action.play': 'abspielen (öffnet die Player-Ansicht)',
  'help.action.openByUrl': 'ein Video per URL öffnen',
  'help.action.openInBrowser': 'im Browser öffnen',
  'help.action.toggleReadUnread': 'gelesen / ungelesen umschalten',
  'help.action.ignore': 'ignorieren (mit u rückgängig machen)',
  'help.action.ignorePlayer': 'ignorieren (schließt/dockt den Player an)',
  'help.action.undoIgnore': 'letztes Ignorieren rückgängig machen',
  'help.action.toggleFavorite': 'Favorit umschalten',
  'help.action.toggleWatchLater': 'Später ansehen umschalten',
  'help.action.addToPlaylist': 'zu einer Wiedergabeliste hinzufügen',
  'help.action.markAllRead': 'alles als gelesen markieren (aktuelle Ansicht)',
  'help.action.toggleLayout': 'Raster-/Listenansicht umschalten',
  'help.action.topEnd': 'Anfang / Ende des geladenen Feeds',
  'help.action.switchView': 'Ansicht wechseln (Alle, Ungelesen, Später ansehen, Wiedergabelisten, Favoriten, Ignoriert)',
  'help.action.reload': 'aus lokalen Daten neu laden',
  'help.action.filter': 'in der Ansicht filtern',
  'help.action.findChannel': 'Kanal suchen (Seitenleiste)',
  'help.action.toggleSidebar': 'Seitenleiste ein-/ausblenden',
  'help.action.playPause': 'abspielen / pausieren',
  'help.action.seek': '±5 Sek. springen',
  'help.action.toggleLike': '„Gefällt mir“ umschalten',
  'help.action.toggleSubscribe': 'Kanal abonnieren / Abo kündigen',
  'help.action.toggleComments': 'Kommentare ein-/ausblenden',
  'help.action.nextInQueue': 'nächstes in der Warteschlange (falls vorhanden)',
  'help.action.extractWindow': 'in ein eigenes, immer im Vordergrund bleibendes Fenster auslösen',
  'help.action.maximizeMiniplayer': 'zurück zum vollständigen Player',
  'help.action.closeMiniplayer': 'schließen',
  'help.action.thisOverlay': 'dieses Hilfefenster',
  'help.action.backClose': 'zurück / schließen',

  // Titlebar
  'titlebar.minimize': 'Minimieren',
  'titlebar.maximizeRestore': 'Maximieren / wiederherstellen',
  'titlebar.close': 'Schließen',

  // UrlPrompt
  'urlPrompt.title': 'Ein YouTube-Video öffnen',
  'urlPrompt.placeholder': 'https://www.youtube.com/watch?v=…',
  'urlPrompt.notice.shorts':
    'Das ist ein Shorts-Link. Chronicle spielt niemals Shorts ab. Wird im Browser geöffnet…',
  'urlPrompt.notice.channelOrPlaylist': 'Kanäle und Wiedergabelisten werden vorerst im Browser geöffnet.',
  'urlPrompt.notice.invalid': 'Das sieht nicht wie eine YouTube-Video-URL aus.',

  // ConnectPanel
  'connect.readError': 'Die Datei konnte nicht gelesen werden.',
  'connect.title': 'Chronicle mit deinem YouTube-Konto verbinden',
  'connect.intro.part1':
    'Chronicle wird ohne Zugangsdaten ausgeliefert: Du bringst dein eigenes Google-Cloud-Projekt mit, sodass deine Daten und dein API-Kontingent nur dir gehören. Die einmalige Einrichtung dauert etwa zehn Minuten, siehe',
  'connect.intro.part2':
    'im Repository für die Schritt-für-Schritt-Anleitung zum Erstellen des Projekts und zum Herunterladen deiner',
  'connect.intro.part3': '.',
  'connect.step1.title': 'Deinen OAuth-Client importieren',
  'connect.step1.detailDone': 'client_secret.json importiert.',
  'connect.step1.detailPending':
    'Wähle die client_secret.json, die du aus deiner Google-Cloud-Konsole heruntergeladen hast (Typ Desktop-App).',
  'connect.step1.buttonDone': 'Datei ersetzen…',
  'connect.step1.button': 'client_secret.json auswählen…',
  'connect.step2.title': 'In deinem Browser autorisieren',
  'connect.step2.detail':
    'Dein Standardbrowser öffnet den Google-Zustimmungsbildschirm; Chronicle wartet lokal (127.0.0.1) auf die Antwort. Tokens verlassen diesen Rechner niemals.',
  'connect.step2.buttonConnecting': 'Warte auf den Browser…',
  'connect.step2.button': 'Mit Google verbinden',
  'connect.storageWarning':
    'Hinweis: Es wurde kein Schlüsselbund des Betriebssystems gefunden, daher wird dein Token mit umkehrbarer lokaler Verschlüsselung gespeichert; jeder mit Zugriff auf dein Benutzerkonto könnte ihn lesen.',

  // SettingsView
  'settings.language.heading': 'Sprache',
  'settings.language.label': 'Sprache',
  'settings.language.system': 'Systemeinstellung übernehmen',
  'settings.language.unreviewedNote': 'Diese Übersetzung wurde von einer KI erstellt und noch nicht von einem Muttersprachler geprüft.',
  'settings.language.unreviewedNoteDetail':
    'Sie kann Fehler oder unnatürliche Formulierungen enthalten. Wenn du diese Sprache sprichst, ist eine Korrektur oder vollständige Überprüfung ein willkommener Beitrag.',
  'settings.connection.heading': 'Verbindung',
  'settings.connection.stateConnected': 'Mit deinem Google-Konto verbunden.',
  'settings.connection.stateDisconnected': 'API-Schlüssel importiert, aber nicht verbunden.',
  'settings.connection.stateUnconfigured': 'Noch kein API-Schlüssel importiert.',
  'settings.connection.scopeGrantedPrefix': 'Gewährter Berechtigungsumfang:',
  'settings.connection.scopeName.readonly': 'YouTube – nur Lesezugriff',
  'settings.connection.scopeName.readonlyPlusWrite': 'YouTube – Lesezugriff + Abonnieren/Kommentieren/„Gefällt mir“',
  'settings.connection.scopeGrantedSuffix.readonly':
    'Wird verwendet, um deine Abos aufzulisten und Video-Metadaten abzurufen. Abonnieren, Kommentieren und „Gefällt mir“ sind ebenfalls direkt in der App verfügbar; beim ersten Gebrauch fragt Chronicle nach dieser zusätzlichen Berechtigung.',
  'settings.connection.scopeGrantedSuffix.readonlyPlusWrite':
    'Wird verwendet, um deine Abos aufzulisten, Video-Metadaten abzurufen und nur für Aktionen, die du selbst ausführst (abonnieren/Abo kündigen, kommentieren, „Gefällt mir“), in deinem Namen zu handeln. Chronicles eigene Lese-/Ansehen-/Favoriten-Zustände bleiben in jedem Fall lokal; sie werden nie an YouTube übertragen.',
  'settings.connection.revokeLink': 'Jederzeit widerrufen ↗',
  'settings.connection.keychainOk': 'Dein Schlüssel und Token werden im Schlüsselbund deines Systems gespeichert.',
  'settings.connection.keychainFallback':
    'Kein Schlüsselbund des Betriebssystems gefunden. Dein Token wird mit umkehrbarer lokaler Verschlüsselung gespeichert; jeder mit Zugriff auf dein Benutzerkonto kann ihn lesen.',
  'settings.connection.playerSessionNote':
    'Der eingebettete Player und der Live-Chat verwenden ihre eigene, separate Browser-Sitzung.',
  'settings.connection.playerSessionNoteDetail':
    'Melde dich dort an, falls die Wiedergabe jemals YouTubes Hinweis „Bestätige, dass du kein Bot bist“ anzeigt, oder um in einem Live-Chat zu schreiben; das ist ein einmaliger Schritt. Hier würde auch die werbefreie Wiedergabe von YouTube Premium greifen, falls du bei Premium angemeldet bist.',
  'settings.connection.signInToYouTubeButton': 'Bei YouTube anmelden',
  'settings.connection.reconnectButton': '„{account}“ erneut verbinden',
  'settings.connection.replaceKeyButton': 'API-Schlüssel ersetzen',
  'settings.connection.fixWeeklyLogoutButton': 'Wöchentliche Abmeldung beheben',
  'settings.connection.signOutButton': 'Abmelden',
  'settings.sync.heading': 'Synchronisierung',
  'settings.sync.backgroundRefresh': 'Aktualisierung im Hintergrund',
  'settings.sync.every15': 'Alle 15 Minuten',
  'settings.sync.every30': 'Alle 30 Minuten',
  'settings.sync.everyHour': 'Stündlich',
  'settings.sync.manualOnly': 'Nur manuell',
  'settings.sync.note': 'Überprüft bei jeder Aktualisierung auch erneut deine Abos.',
  'settings.sync.noteDetail':
    'Ein neues Abo erscheint automatisch bei der nächsten Synchronisierung; du musst hier nichts tun.',
  'settings.sync.checkForUpdates': 'Nach Updates suchen',
  'settings.sync.checkForUpdatesNote':
    'Chronicle {version}. Prüft höchstens einmal täglich auf GitHub, ob eine neuere Version verfügbar ist.',
  'settings.sync.checkForUpdatesNoteDetail':
    'Lädt oder installiert niemals automatisch irgendetwas; du entscheidest selbst auf der Release-Seite.',
  'settings.playback.heading': 'Wiedergabe',
  'settings.playback.defaultSpeed': 'Standardgeschwindigkeit',
  'settings.playback.speedNormal': 'Normal',
  'settings.playback.note': 'Der Player öffnet sich bereits mit dieser Geschwindigkeit.',
  'settings.playback.noteDetail':
    'Du kannst sie pro Video weiterhin über die eigenen Steuerelemente des eingebetteten Players ändern; das ändert nie diesen Standardwert.',
  'settings.playback.watchLaterAutoRemove': 'Beim Öffnen aus „Später ansehen“ entfernen',
  'settings.playback.watchLaterAutoRemoveNote': 'Entfernt das Video in dem Moment, in dem du es öffnest, aus der Warteschlange.',
  'settings.playback.watchLaterAutoRemoveNoteDetail':
    'Genau wie wenn du es selbst abwählst. Standardmäßig deaktiviert, sodass sich die Warteschlange nur verkleinert, wenn du es so sagst.',
  'settings.playback.showDislikeEstimate': 'Geschätzte Anzahl an „Gefällt mir nicht“ anzeigen',
  'settings.playback.showDislikeEstimateNote':
    'YouTube hat die öffentliche „Gefällt mir nicht“-Zählung 2021 entfernt; die „Gefällt mir“-Zählung ist weiterhin real.',
  'settings.playback.showDislikeEstimateNoteDetail':
    'Standardmäßig deaktiviert. Das Aktivieren sendet die ID jedes Videos an returnyoutubedislike.com (einen kostenlosen Drittanbieterdienst, nicht YouTube), um eine Schätzung abzurufen. Es werden keine weiteren Informationen über dich gesendet.',
  'settings.playback.showDislikeEstimateAttribution': 'Schätzungen zu „Gefällt mir nicht“ bereitgestellt von',
  'settings.appearance.heading': 'Erscheinungsbild',
  'settings.appearance.theme': 'Design',
  'settings.appearance.themeSystem': 'Systemeinstellung übernehmen',
  'settings.appearance.themeDark': 'Dunkel',
  'settings.appearance.themeLight': 'Hell',
  'settings.appearance.showViewCounts': 'Aufrufzahlen anzeigen',
  'settings.appearance.showShorts': 'Shorts anzeigen',
  'settings.startup.heading': 'Start & Hintergrund',
  'settings.startup.autoStart': 'Chronicle automatisch bei der Anmeldung starten',
  'settings.startup.backgroundMode': 'Beim Schließen des Fensters im Hintergrund weiterlaufen',
  'settings.startup.backgroundModeNote': 'Ein Symbol in der Taskleiste lässt dich Chronicle wieder öffnen oder endgültig beenden.',
  'settings.startup.backgroundModeNoteDetail':
    'Das Schließen des Fensters blendet es nur aus, anstatt die App zu beenden, sodass die Synchronisierung (und Benachrichtigungen, falls unten aktiviert) im Hintergrund weiterlaufen.',
  'settings.startup.popOutOnClose': 'Video beim Schließen des Fensters auslösen',
  'settings.startup.popOutOnCloseNote':
    'Das Schließen des Fensters löst ein laufendes Video stattdessen in den schwebenden Player aus.',
  'settings.startup.popOutOnCloseNoteDetail':
    'Genau wie das Drücken von p. Das Schließen dieses schwebenden Players stoppt die Wiedergabe tatsächlich. Deaktiviere dies, und das Schließen des Fensters pausiert das Video, anstatt es auszulösen.',
  'settings.startup.startMinimized': 'Minimiert in der Taskleiste starten (Fenster nicht öffnen)',
  'settings.startup.startMinimizedNote': 'Gilt nur für den automatischen Start bei der Anmeldung.',
  'settings.startup.startMinimizedNoteDetail':
    'Wenn du Chronicle selbst öffnest, wird das Fenster unabhängig von dieser Einstellung immer angezeigt.',
  'settings.notifications.heading': 'Benachrichtigungen',
  'settings.notifications.enabled': 'Über neue Videos benachrichtigen',
  'settings.notifications.backgroundModeHint': 'Benachrichtigungen werden nur ausgelöst, während Chronicle läuft.',
  'settings.notifications.backgroundModeHintDetail':
    'Aktiviere oben „Im Hintergrund ausführen“, damit sie auch nach dem Schließen des Fensters weiterlaufen.',
  'settings.notifications.scope': 'Benachrichtigen über',
  'settings.notifications.scopeAll': 'Alle Kanäle',
  'settings.notifications.scopeSelected': 'Ausgewählte Kanäle',
  'settings.notifications.scopeSelectedHint':
    'Schalte Benachrichtigungen pro Kanal über das Symbol daneben in der Seitenleiste oder auf der Kanalseite um.',
  'settings.notifications.notifyShorts': 'Über neue Shorts benachrichtigen',
  'settings.notifications.notifyShortsNote':
    'Deaktiviert bedeutet, dass Shorts weiterhin in deinem Feed erscheinen, aber ohne Benachrichtigung.',
  'settings.notifications.notifyShortsNoteDetail':
    'Praktisch für Kanäle, die häufig Shorts veröffentlichen. Aus dem obigen Feed ausgeblendete Shorts benachrichtigen in keinem Fall.',
  'settings.notifications.autoFavorite': 'Für Kanäle, die ich favorisiere, automatisch benachrichtigen',
  'settings.notifications.autoFavoriteNote':
    'Einen Kanal zu favorisieren aktiviert Benachrichtigungen dafür; das Entfernen aus den Favoriten deaktiviert sie wieder.',
  'settings.notifications.autoFavoriteNoteDetail':
    'Es sei denn, du änderst den Benachrichtigungsstatus dieses Kanals später selbst – das wird immer respektiert.',
  'settings.notifications.autoFavoriteDisableConfirm':
    'Auch Benachrichtigungen für deine aktuell favorisierten Kanäle deaktivieren?',
  'settings.notifications.autoFavoriteDisableKeep': 'So belassen',
  'settings.notifications.autoFavoriteDisableClear': 'Für Favoriten deaktivieren',
  'settings.data.heading': 'Daten',
  'settings.data.note': 'Alles, was Chronicle weiß, befindet sich auf diesem Computer.',
  'settings.data.noteDetail':
    'Der Export ist eine einzelne dokumentierte JSON-Datei (FORMAT.md im Repository); du kannst jederzeit mit allem gehen. Die SQLite-Datei selbst ist ebenfalls eine legitime Sicherungskopie.',
  'settings.data.exportButton': 'Daten exportieren…',
  'settings.data.deleteConfirmButton': 'Erneut klicken, um die Datenbank und deinen Schlüssel zu löschen',
  'settings.data.deleteButton': 'Alle lokalen Daten löschen',
  'settings.data.exportedBanner': '{videos} Videos und {states} Zustände nach {path} exportiert',
  'settings.data.exportFailedBanner': 'Export fehlgeschlagen: {message}',
  'settings.data.storageLine': '{db} Datenbank · {cache} Thumbnail-Cache · {videos} Videos',

  // Wizard — shared chrome
  'wizard.exitButton': '✕ Schließen',
  'wizard.screenshot.placeholder':
    'Screenshot noch ausstehend. Der Text links ist die vollständige Anleitung.',
  'wizard.screenshot.verifiedOn': 'verifiziert am {date}',
  'wizard.nav.back': '← Zurück',
  'wizard.nav.next': 'Weiter →',
  'wizard.copyRow.copy': 'Kopieren',
  'wizard.copyRow.copied': 'Kopiert ✓',

  // Wizard — WelcomeStep
  'wizard.welcome.heading':
    'Chronicle hat keinen Server und keinen API-Schlüssel. Du erstellst deinen eigenen.',
  'wizard.welcome.intro.pre': 'Es ist kostenlos, dauert etwa',
  'wizard.welcome.intro.strong': '10 Minuten, nur einmal',
  'wizard.welcome.intro.post': ', und bedeutet, dass deine Daten und dein Zugang nur dir gehören:',
  'wizard.welcome.bullet.quota': 'Dein eigenes API-Kontingent, mit niemandem geteilt.',
  'wizard.welcome.bullet.noThirdParty':
    'Kein Dritter ist beteiligt. Die Entwickler von Chronicle greifen nie auf dein Konto zu.',
  'wizard.welcome.bullet.revocable': 'Von dir jederzeit widerrufbar, in deiner eigenen Google-Konsole.',
  'wizard.welcome.dim': 'Du brauchst ein Google-Konto. Ein Abrechnungskonto ist nicht erforderlich.',
  'wizard.welcome.startButton': 'Jetzt einrichten',
  'wizard.welcome.quickPathButton': 'Ich habe das schon einmal gemacht: nur meinen Schlüssel importieren',

  // Wizard — ConsoleStep (shared)
  'wizard.step.heading': 'Schritt {label}: {title}',
  'wizard.step.variationsSummary': 'Sieht etwas anders aus?',

  // Wizard — ConsoleStep: project
  'wizard.step.project.title': 'Ein Google-Cloud-Projekt erstellen',
  'wizard.step.project.why':
    'Google gruppiert den API-Zugriff in „Projekte“. Du brauchst eines, um deinen eigenen Schlüssel zu hosten. Es ist kostenlos, und für das Standardkontingent der YouTube-API ist kein Abrechnungskonto erforderlich.',
  'wizard.step.project.urlLabel': 'Seite zum Erstellen des Projekts öffnen',
  'wizard.step.project.copyLabel': 'Vorgeschlagener Projektname',
  'wizard.step.project.confirmLabel': 'Ich habe das Projekt erstellt.',
  'wizard.step.project.variations':
    'Falls Google nach einer Organisation fragt, wähle „Keine Organisation“. Falls du bereits Projekte hast, zeigt die Seite zunächst möglicherweise eine Auswahl an. Verwende „Neues Projekt“.',

  // Wizard — ConsoleStep: enable-api
  'wizard.step.enableApi.title': 'Die YouTube Data API v3 aktivieren',
  'wizard.step.enableApi.why':
    'Projekte starten mit deaktivierten APIs; du aktivierst nur die, die Chronicle braucht: deine Abos, Video-Metadaten und (nur wenn du dich entscheidest zu abonnieren, zu kommentieren oder „Gefällt mir“ zu klicken) auch diese Aktionen.',
  'wizard.step.enableApi.urlLabel': 'Seite der YouTube Data API öffnen',
  'wizard.step.enableApi.confirmLabel': 'Ich habe auf „Aktivieren“ geklickt.',
  'wizard.step.enableApi.variations':
    'Stelle sicher, dass dein neues Projekt in der blauen oberen Leiste ausgewählt ist, bevor du auf „Aktivieren“ klickst. Wenn die Schaltfläche „Verwalten“ anzeigt, ist die API bereits aktiviert. Hier bist du fertig.',

  // Wizard — ConsoleStep: consent
  'wizard.step.consent.title': 'Den OAuth-Zustimmungsbildschirm konfigurieren',
  'wizard.step.consent.why':
    'Das ist der Berechtigungsbildschirm, den du beim Verbinden siehst. Da es dein eigenes Projekt ist, bist du sowohl Entwickler als auch einziger Nutzer.',
  'wizard.step.consent.urlLabel': 'Einstellungen des Zustimmungsbildschirms öffnen',
  'wizard.step.consent.copyLabel': 'Vorgeschlagener App-Name',
  'wizard.step.consent.confirmLabel':
    'Ich habe den Zustimmungsbildschirm konfiguriert (Extern, meine E-Mail in beiden Kontaktfeldern).',
  'wizard.step.consent.variations':
    'Nutzertyp: Extern (Intern gibt es nur für Workspace-Organisationen). Logo und Scopes müssen nicht hinzugefügt werden. Chronicle fragt beim Verbinden nach seinem Nur-Lese-Scope. Überspringe alle optionalen Abschnitte. Google benennt diese Seite gelegentlich in „Zielgruppe“ / „Branding“ innerhalb von „Google Auth Platform“ um.',

  // Wizard — ConsoleStep: test-user
  'wizard.step.testUser.title': 'Dich selbst als Testnutzer hinzufügen',
  'wizard.step.testUser.why':
    'Solange sich das Projekt im Modus „Test“ befindet, können sich nur aufgeführte Testnutzer anmelden. Das bist du.',
  'wizard.step.testUser.urlLabel': 'Zustimmungsbildschirm öffnen (Abschnitt Testnutzer)',
  'wizard.step.testUser.confirmLabel': 'Ich habe meine E-Mail als Testnutzer hinzugefügt.',
  'wizard.step.testUser.variations':
    'Im neueren Layout „Google Auth Platform“ befindet sich die Liste unter Zielgruppe → Testnutzer. Verwende genau das Google-Konto, mit dem du dich verbinden wirst.',
  'wizard.step.testUser.emailLabel': 'Welches Google-Konto wirst du verwenden?',
  'wizard.step.testUser.emailPlaceholder': 'du@gmail.com',
  'wizard.step.testUser.copyEmailLabel': 'Für die Testnutzerliste kopieren',
  'wizard.step.testUser.emailNote': 'Wird nur auf diesem Rechner gespeichert, nur für diesen Assistenten.',

  // Wizard — ConsoleStep: publish
  'wizard.step.publish.title': 'Die App veröffentlichen (empfohlen)',
  'wizard.step.publish.why':
    'Im Testmodus lässt Google deine Verbindung alle 7 Tage ablaufen. Ein Klick auf „App veröffentlichen“ macht dein Token dauerhaft. Beim Verbinden siehst du möglicherweise eine Warnung „Nicht verifizierte App“. Das ist zu erwarten: Der „nicht verifizierte Entwickler“ bist du.',
  'wizard.step.publish.urlLabel': 'Zustimmungsbildschirm öffnen (App veröffentlichen)',
  'wizard.step.publish.variations':
    'Das Veröffentlichen mit nur dem Nur-Lese-Scope von YouTube erfordert keine Verifizierungsprüfung durch Google. Wenn du dies überspringst, erkennt Chronicle den wöchentlichen Ablauf und bietet eine Wiederverbindung mit zwei Klicks sowie einen Link zurück zu diesem Schritt.',
  'wizard.step.publish.publishedButton': 'Ich habe sie veröffentlicht',
  'wizard.step.publish.skipButton': 'Überspringen: Ich akzeptiere wöchentliches Neuverbinden',

  // Wizard — ConsoleStep: client
  'wizard.step.client.title': 'Einen Desktop-OAuth-Client erstellen',
  'wizard.step.client.why':
    'Dies erstellt die eigentliche Schlüsseldatei, die Chronicle verwenden wird. Sie identifiziert deine Chronicle-Installation gegenüber deinem Projekt.',
  'wizard.step.client.urlLabel': 'Seite der Anmeldedaten öffnen',
  'wizard.step.client.copyLabel': 'Vorgeschlagener Client-Name',
  'wizard.step.client.confirmLabel': 'Ich habe den Desktop-Client erstellt und die JSON-Datei heruntergeladen.',
  'wizard.step.client.variations':
    'Anmeldedaten erstellen → OAuth-Client-ID → Der Anwendungstyp muss „Desktop-App“ sein (nicht „Webanwendung“). Der Download heißt normalerweise client_secret_….json und landet in deinem Downloads-Ordner.',

  // Wizard — ImportStep / FileDrop
  'wizard.import.heading': 'Schritt 6: Deine Schlüsseldatei importieren',
  'wizard.import.why.part1': 'Wähle die',
  'wizard.import.why.part2':
    'die du heruntergeladen hast. Chronicle extrahiert den Schlüssel in deinen System-Schlüsselbund. Er verlässt diesen Rechner nie und berührt nie einen Server.',
  'wizard.import.drop.part1': 'Lege',
  'wizard.import.drop.part2': 'hier ab, oder klicke, um sie auszuwählen',
  'wizard.import.backToClientStep': '← Zurück zu Schritt 5 (einen Desktop-Client erstellen)',
  'wizard.import.okMessage':
    '✓ Schlüssel importiert. Chronicle speichert ihn in deinem System-Schlüsselbund, nie online.',
  'wizard.import.okNote':
    'Du kannst die heruntergeladene Datei jetzt löschen, wenn du möchtest; Chronicle berührt deine Dateien nie.',
  'wizard.import.storageWarning':
    'Es wurde kein Schlüsselbund des Betriebssystems gefunden, daher wird der Schlüssel mit umkehrbarer lokaler Verschlüsselung gespeichert; jeder mit Zugriff auf dein Benutzerkonto könnte ihn lesen.',

  // Wizard — ConnectStep
  'wizard.connect.heading': 'Schritt 7: Mit Google verbinden',
  'wizard.connect.why':
    'Dein Browser öffnet den Google-Zustimmungsbildschirm. Chronicle wartet lokal (127.0.0.1) auf die Antwort. Tokens verlassen diesen Rechner niemals.',
  'wizard.connect.warningTitle': 'Hinweis: die Warnung „Nicht verifizierte App“.',
  'wizard.connect.warning.part1': 'Google zeigt möglicherweise',
  'wizard.connect.warning.quote': '„Google hat diese App nicht verifiziert“',
  'wizard.connect.warning.part2': '. Das ist zu erwarten. Der nicht verifizierte Entwickler bist',
  'wizard.connect.warning.you': 'du',
  'wizard.connect.warning.part3': '. Klicke auf',
  'wizard.connect.warning.advanced': 'Erweitert',
  'wizard.connect.warning.goUnsafe': 'Zu Chronicle wechseln (unsicher)',
  'wizard.connect.warning.part4': '. Das ist hier sicher, weil du deinem eigenen Projekt vertraust.',
  'wizard.connect.button': 'Mit Google verbinden',
  'wizard.connect.buttonWaiting': 'Warte auf den Browser…',
  'wizard.connect.apiNotEnabledError': 'Die YouTube Data API ist in deinem Projekt nicht aktiviert.',
  'wizard.connect.testUserHint':
    'Wenn Google die Anmeldung blockiert hat, liegt die übliche Ursache in einem fehlenden Testnutzer (Schritt 4), während sich das Projekt im Testmodus befindet.',
  'wizard.connect.fixItButton': '← In Schritt {step} beheben',
  'wizard.connect.connectedPlain': '✓ Verbunden.',
  'wizard.connect.connectedAs': '✓ Verbunden als {name}.',
  'wizard.connect.closingNote':
    'Alles, was Chronicle weiß, wird auf diesem Computer gespeichert. Dein Schlüssel kann jederzeit unter myaccount.google.com/permissions widerrufen werden.',
  'wizard.connect.openChronicleButton': 'Chronicle öffnen →',

  // App — feed buckets
  'app.bucket.today': 'Heute',
  'app.bucket.yesterday': 'Gestern',
  'app.bucket.thisWeek': 'Diese Woche',
  'app.bucket.earlier': 'Früher',
  'app.bucket.favoriteChannels': 'Von deinen bevorzugten Kanälen',

  // App — banners
  'app.banner.connectionFailed': 'Verbindung fehlgeschlagen: {message}',
  'app.banner.reconnectRequired':
    'Verbinde dich erneut mit Google. Deine Autorisierung ist abgelaufen. (Projekte im Testmodus laufen wöchentlich ab; das Veröffentlichen der App behebt dies dauerhaft.)',
  'app.banner.reconnectAction': 'Erneut verbinden',
  'app.banner.offline': 'Du scheinst offline zu sein. Lokale Daten werden angezeigt. Aktualisieren versucht es erneut.',
  'app.banner.refreshFailed': 'Aktualisierung fehlgeschlagen: {message}',
  'app.banner.openVideoFailed': 'Video konnte nicht geöffnet werden: {message}',
  'app.banner.refreshAllFailed':
    'Die Aktualisierung konnte keinen Kanal erreichen ({count} fehlgeschlagen). Prüfe deine Verbindung. Wird im nächsten Zyklus erneut versucht.',
  'app.banner.showDetails': 'Details',
  'app.banner.hideDetails': 'Details ausblenden',
  'app.banner.showDetailsTitle': 'Anzeigen, welche Kanäle fehlgeschlagen sind und warum',
  'app.banner.failureAccountLevel': 'Auf Kontoebene',
  'app.banner.quotaExceeded':
    'Das tägliche API-Limit wurde erreicht. Es wird um {time} deiner Zeit zurückgesetzt. Chronicle arbeitet weiterhin mit lokalen Daten; die Erkennung über RSS läuft kostenlos weiter.',
  'app.banner.signedOut': 'Abgemeldet. Lokale Daten wurden beibehalten. Jederzeit erneut verbinden.',
  'app.banner.updateAvailable': 'Chronicle {version} ist verfügbar.',
  'app.banner.updateAction': 'Release ansehen',
  'app.banner.dismissTitle': 'Verwerfen',
  'app.banner.newVideos': '{count} neue(s) Video{plural}',
  'app.banner.unsubscribeFailed': 'Abo konnte nicht gekündigt werden: {message}',
  'app.banner.searchFailed': 'Suche fehlgeschlagen: {message}',
  'app.banner.subscribeFailed': 'Abo konnte nicht abgeschlossen werden: {message}',
  'app.banner.accountConnectFailed': 'Konto konnte nicht verbunden werden: {message}',
  'app.banner.accountSyncFailed': 'Dieses Konto konnte nicht synchronisiert werden: {message}',
  'app.banner.removeAccountFailed': 'Dieses Konto konnte nicht entfernt werden: {message}',
  'app.banner.videoActionFailed': 'Das konnte nicht ausgeführt werden: {message}',
  'app.writeScopeDialog.body':
    'Chronicle benötigt für diese Aktion (Like, Abonnieren oder Kommentieren) eine einmalige zusätzliche Berechtigung von Google. Ein Fortfahren öffnet deinen Browser, um sie zu erteilen.',
  'app.writeScopeDialog.cancel': 'Jetzt nicht',
  'app.writeScopeDialog.continue': 'Weiter zu Google',

  // App — sidebar
  'app.sidebar.showTitle': 'Seitenleiste anzeigen',

  // App — topbar
  'app.topbar.refreshTitle': 'Aktualisieren (r)',
  'app.topbar.channelFallback': 'Kanal',
  'app.topbar.markAllRead': 'Alles als gelesen markieren (M)',
  'app.topbar.searchYouTubePlaceholder': 'Suchen',
  'app.topbar.searchChannelPlaceholder': 'Diesen Kanal durchsuchen',
  'app.topbar.clearFilterTitle': 'Löschen',
  'app.topbar.itemSizeTitle': 'Elementgröße: {size}',
  'app.topbar.switchToListView': 'Zur Listenansicht wechseln (v)',
  'app.topbar.switchToGridView': 'Zur Rasteransicht wechseln (v)',
  'app.topbar.unsubscribe': 'Abo kündigen',
  'app.topbar.confirmUnsubscribe': 'Erneut klicken, um das Abo zu kündigen',
  'app.topbar.openChannelTitle': 'Die YouTube-Seite dieses Kanals öffnen',
  'app.topbar.favoriteChannelTitle': 'Favorit: oben im Hauptfeed priorisieren',
  'app.topbar.unfavoriteChannelTitle': 'Aus Favoriten entfernen',

  // App — status text
  'app.status.filteringShorts': 'Shorts werden identifiziert ({checked} von {total} geprüft)…',
  'app.status.checkingChannels': '{checked} von {total} Kanälen werden geprüft…',
  'app.status.refreshing': 'wird aktualisiert…',
  'app.status.caughtUp': 'Alles auf dem neuesten Stand',
  'app.status.lastRefreshSuffix': ' · letzte Aktualisierung {time}',
  'app.status.unreadCount': '{count} ungelesen',
  'app.status.checkingChannelsInfo':
    'Prüft die Uploads jedes abonnierten Kanals auf Videos, die seit der letzten Synchronisierung veröffentlicht wurden.',
  'app.status.filteringShortsInfo':
    'Bestätigt, welche der neu gefundenen Videos YouTube-Shorts sind.',
  'app.status.refreshingInfo':
    'Listet deine Abos neu auf und prüft dann jeden Kanal auf neue Videos.',

  // App — feed
  'app.feed.emptyFiltered': 'Nichts entspricht dem Filter.',
  'app.feed.emptyNoVideos': 'Hier ist noch nichts.',

  // FeedList — shared between list rows and grid cards
  'feed.card.undoLabel': 'Ignoriert: wird diese Ansicht verlassen',
  'feed.card.undoButton': 'Rückgängig (u)',
  'feed.card.undoLabelPlaylist': 'Aus Wiedergabeliste entfernt: wird diese Liste verlassen',
  'feed.card.undoButtonPlaylist': 'Rückgängig',
  'feed.card.favoriteTitle': 'Favorit',
  'feed.card.watchLaterTitle': 'Später ansehen',
  'feed.card.toggleReadTitle': 'Gelesen umschalten (m)',
  'feed.card.ignoreTitle': 'Ignorieren (i)',
  'feed.card.toggleFavoriteTitle': 'Favorit umschalten (f)',
  'feed.card.toggleWatchLaterTitle': 'Später ansehen umschalten (w)',
  'feed.card.openInBrowserTitle': 'Im Browser öffnen (b)',
  'feed.card.addToPlaylistTitle': 'Zu einer Wiedergabeliste hinzufügen',
  'feed.card.removeFromPlaylistTitle': 'Aus dieser Wiedergabeliste entfernen',
  'feed.card.shortBadge': 'Short',
  'feed.card.liveBadge': 'Live',
  'feed.card.premiereBadge': 'Premiere',
  'feed.card.upcomingBadge': 'Demnächst',
  'feed.loadingMore': 'Lädt mehr…',

  // PlayerView
  'player.topbar.back': '← Zurück',
  'player.topbar.backToFeed': '← Zurück zum Feed',
  'player.miniplayer.maximizeTitle': 'Zurück zum vollständigen Player (e)',
  'player.miniplayer.closeTitle': 'Schließen (x)',
  'player.extractTitle': 'In ein eigenes, immer im Vordergrund bleibendes Fenster auslösen (p)',
  'player.shareTitle': 'Teilen',
  'player.miniplayer.resizeTitle': 'Zum Ändern der Größe ziehen',
  'player.overlay.back': 'Zurück (Esc)',
  'player.overlay.unavailableTitle': 'Dieses Video kann hier nicht abgespielt werden. Es könnte vom Urheber eingeschränkt oder nicht mehr verfügbar sein.',
  'player.overlay.removeFromLibrary': 'Aus der Bibliothek entfernen',
  'player.overlay.openInBrowser': 'Im Browser öffnen',
  'player.action.markRead': 'Als gelesen markieren (m)',
  'player.action.markUnread': 'Als ungelesen markieren (m)',
  'player.action.favorite': '☆ Favorit (f)',
  'player.action.favorited': '★ Favorisiert (f)',
  'player.action.watchLater': 'Später ansehen (w)',
  'player.action.inWatchLater': 'In „Später ansehen“ (w)',
  'player.action.subscribe': 'Abonnieren (s)',
  'player.action.subscribed': 'Abonniert (s)',
  'player.action.ignore': 'Ignorieren (i)',
  'player.action.openInBrowser': 'Im Browser öffnen (b)',
  'player.action.addToPlaylist': 'Zur Wiedergabeliste hinzufügen (a)',
  'player.action.like': 'Gefällt mir (l)',
  'player.action.liked': 'Gefällt mir bereits (l)',
  'player.action.dislike': 'Gefällt mir nicht',
  'player.action.disliked': 'Gefällt mir nicht bereits',
  'player.dislikeEstimate.disabledHint':
    'Die Zählung von „Gefällt mir nicht“ wurde von YouTube entfernt. Klicke, um eine Schätzung eines Drittanbieterdienstes in den Einstellungen zu aktivieren.',
  'player.dislikeEstimate.errorHint':
    'Die Schätzung für „Gefällt mir nicht“ konnte gerade nicht geladen werden. Die „Gefällt mir“-Zählung oben ist weiterhin real.',
  'player.description.showMore': 'Mehr anzeigen',
  'player.description.showLess': 'Weniger anzeigen',
  'player.description.shortsLinkTitle': 'Shorts öffnen sich im Browser (Chronicle spielt niemals Shorts ab)',
  'player.upNext.label': 'Als Nächstes aus „Später ansehen“',
  'player.upNext.labelPlaylist': 'Als Nächstes in {name}',
  'player.upNext.dismiss': 'Verwerfen',
  'player.chat.toggle': 'Live-Chat anzeigen',
  'player.chat.extractTitle': 'Chat in ein eigenes Fenster auslösen',
  'player.chat.signInInfo':
    'Der Live-Chat wird direkt von YouTube geladen, sodass Chronicles eigene Anmeldung sich nicht darauf überträgt. Du musst dich hier separat anmelden, nur einmal.',
  'player.chat.signInHint': 'Möchtest du chatten? Du musst dich auch hier bei YouTube anmelden:',
  'player.chat.signInLink': 'Bei YouTube anmelden',
  'player.chat.signInWindowTitle': 'Für Live-Chat anmelden',

  // Sidebar
  'sidebar.collapseTitle': 'Seitenleiste einklappen',
  'sidebar.view.all': 'Alle',
  'sidebar.view.unread': 'Ungelesen',
  'sidebar.view.watchLater': 'Später ansehen',
  'sidebar.view.favorites': 'Favoriten',
  'sidebar.view.playlists': 'Wiedergabelisten',
  'sidebar.view.ignored': 'Ignoriert',
  'sidebar.channelsHeader': 'Kanäle',
  'sidebar.channelSortTitle': 'Kanäle sortieren',
  'sidebar.channelSort.favorites': 'Favoriten',
  'sidebar.channelSort.recent': 'Neueste',
  'sidebar.channelSort.unread': 'Ungelesen',
  'sidebar.channelSort.name': 'Name',
  'sidebar.findChannelPlaceholder': 'Kanal suchen  c',
  'sidebar.clearTitle': 'Löschen',
  'sidebar.noChannelMatch': 'Kein Kanal passt.',
  'sidebar.noChannels': 'Dieses Konto folgt noch keinen Kanälen.',
  'sidebar.settingsLabel': 'Einstellungen',

  // Sidebar — Accounts (B-003)
  'sidebar.accountsHeader': 'Konten',
  'sidebar.accountDisconnected': 'Erneute Verbindung erforderlich',
  'sidebar.addAccount': '+ Konto hinzufügen',
  'sidebar.accountMenu.title': 'Mehr',
  'sidebar.accountMenu.syncNow': 'Jetzt synchronisieren',
  'sidebar.accountMenu.remove': 'Konto entfernen',
  'sidebar.accountMenu.confirmRemove': 'Erneut klicken zum Entfernen',
  'sidebar.accountMenu.removeDisabledTitle':
    'Das primäre Konto kann hier nicht entfernt werden. Verwende stattdessen „Abmelden“ in den Einstellungen',
  'sidebar.channelMenu.title': 'Mehr',
  'sidebar.channelMenu.unsubscribe': 'Abo kündigen',
  'sidebar.channelMenu.confirmUnsubscribe': 'Erneut klicken zum Bestätigen',
  'sidebar.channelMenu.favorite': 'Favorit: oben im Hauptfeed priorisieren',
  'sidebar.channelMenu.unfavorite': 'Aus Favoriten entfernen',
  'sidebar.channelMenu.notify': 'Über neue Videos dieses Kanals benachrichtigen',
  'sidebar.channelMenu.unnotify': 'Benachrichtigungen für diesen Kanal beenden',

  // YouTube search (B-009)
  'search.empty': 'Keine Ergebnisse.',
  'search.searching': 'Durchsucht ganz YouTube…',
  'search.searchingChannel': 'Durchsucht diesen Kanal…',
  'search.channelLoading': 'Kanal wird geladen…',
  'search.subscribeButton': 'Abonnieren',
  'search.subscribedButton': 'Abonniert',
  'search.videoChannelPrefix': 'auf',
  'search.loadingMore': 'Lädt weitere Ergebnisse…',

  // Comments (B-006)
  'comments.show': 'Kommentare anzeigen (c)',
  'comments.hide': 'Kommentare ausblenden (c)',
  'comments.loading': 'Kommentare werden geladen…',
  'comments.loadingMore': 'Lädt weitere Kommentare…',
  'comments.empty': 'Noch keine Kommentare.',
  'comments.reconnectRequired':
    'Deine Verbindung muss erneuert werden. Verbinde dich über die Einstellungen erneut, um Kommentare zu sehen.',
  'comments.addPlaceholder': 'Einen Kommentar hinzufügen…',
  'comments.replyPlaceholder': 'Eine Antwort schreiben…',
  'comments.postButton': 'Veröffentlichen',
  'comments.posting': 'Wird veröffentlicht…',
  'comments.replyButton': 'Antworten',
  'comments.openInBrowserTitle': 'Kommentar im Browser öffnen',
  'comments.sortTop': 'Top-Kommentare',
  'comments.sortNewest': 'Neueste zuerst',
  'comments.editButton': 'Bearbeiten',
  'comments.saveButton': 'Speichern',
  'comments.cancelButton': 'Abbrechen',

  // Add another account (B-003)
  'addAccount.title': 'Ein weiteres Google-Konto hinzufügen',
  'addAccount.instructions':
    'Füge die E-Mail-Adresse des neuen Kontos als Testnutzer zu deinem bestehenden Google-Cloud-Projekt hinzu (demselben aus deiner ersten Einrichtung) und verbinde es dann unten.',
  'addAccount.openTestUsersLink': 'Testnutzer-Einstellungen öffnen',
  'addAccount.connectButton': 'Google-Konto verbinden',
  'addAccount.connecting': 'Warte auf den Browser…',
  'addAccount.cancelButton': 'Abbrechen',

  // Playlists — local-only, never synced to YouTube.
  'playlists.createButton': '+ Neue Wiedergabeliste',
  'playlists.emptyTitle': 'Noch keine Wiedergabelisten.',
  'playlists.emptyHint': 'Verwende „Zur Wiedergabeliste hinzufügen“ bei einem beliebigen Video, um eine zu starten.',
  'playlists.videoCount': '{count} Video{plural}',
  'playlists.dialog.createTitle': 'Neue Wiedergabeliste',
  'playlists.dialog.nameLabel': 'Name',
  'playlists.dialog.namePlaceholder': 'Name der Wiedergabeliste',
  'playlists.dialog.descriptionLabel': 'Beschreibung',
  'playlists.dialog.descriptionPlaceholder': 'Beschreibung (optional)',
  'playlists.dialog.create': 'Erstellen',
  'playlists.dialog.cancel': 'Abbrechen',

  // Import a YouTube playlist (D-059)
  'playlists.importButton': 'Von YouTube importieren',
  'playlists.dialog.importTitle': 'Eine YouTube-Wiedergabeliste importieren',
  'playlists.dialog.urlPlaceholder': 'Füge die URL einer YouTube-Wiedergabeliste ein',
  'playlists.dialog.import': 'Importieren',
  'playlists.dialog.importing': 'Wird importiert…',
  'playlists.dialog.importLog.starting': 'Wird gestartet…',
  'playlists.dialog.importLog.meta': 'Informationen zur Wiedergabeliste werden abgerufen…',
  'playlists.dialog.importLog.collecting': 'Bisher {count} Videos gefunden…',
  'playlists.dialog.importLog.hydrating': '{count} von {total} Videos importiert…',
  'playlists.dialog.importLog.stillWorking': 'Noch in Arbeit: Das kann bei einer großen Wiedergabeliste eine Weile dauern…',
  'playlists.dialog.importLog.done': 'Fertig: {imported} von {total} Videos importiert.',

  // Sync an imported playlist (D-059)
  'playlists.sync.upToDate': 'Auf dem neuesten Stand',
  'playlists.sync.checkButton': 'Synchronisieren',
  'playlists.sync.button': 'Synchronisieren ({count} neu)',
  'playlists.sync.syncing': 'Wird synchronisiert…',

  'playlistDetail.editNameTitle': 'Name bearbeiten',
  'playlistDetail.editDescriptionTitle': 'Beschreibung bearbeiten',
  'playlistDetail.addDescriptionPlaceholder': 'Eine Beschreibung hinzufügen…',
  'playlistDetail.saveTitle': 'Speichern',
  'playlistDetail.cancelEditTitle': 'Abbrechen',
  'playlistDetail.deleteButton': 'Wiedergabeliste löschen',
  'playlistDetail.confirmDelete': 'Erneut klicken zum Bestätigen',
  'playlistDetail.empty': 'Diese Wiedergabeliste ist leer.',
  'playlistDetail.emptyHint': 'Verwende „Zur Wiedergabeliste hinzufügen“ bei einem beliebigen Video, um hier eines hinzuzufügen.',

  'addToPlaylist.title': 'Zur Wiedergabeliste hinzufügen',
  'addToPlaylist.empty': 'Noch keine Wiedergabelisten. Erstelle unten eine.',
  'addToPlaylist.newPlaylistPlaceholder': 'Name der neuen Wiedergabeliste',
  'addToPlaylist.create': 'Erstellen',
  'addToPlaylist.done': 'Fertig',

  'share.title': 'Teilen',
  'share.copy': 'Kopieren',
  'share.copied': 'Kopiert',
  'share.includeTimestamp': 'Aktuellen Zeitstempel einfügen ({time})',
  'share.done': 'Fertig'
}

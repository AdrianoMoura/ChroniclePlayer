import type { Dict, LocaleMeta } from '../types'

// This translation was AI-generated and has not yet been reviewed by a
// native speaker — it may contain mistakes or awkward phrasing. If you
// speak Italian, a correction or a full review is a welcome contribution:
// this is a plain
// Partial<Dict>, so missing/wrong keys don't break anything — t() falls
// back to English for any key missing here. `{name}`-style placeholders
// must stay exactly as in en.ts; only the surrounding text should change.
export const meta: LocaleMeta = { code: 'it', nativeName: 'Italiano', reviewed: false }

export const dict: Partial<Dict> = {
  // format.ts
  'format.minutesAgo': '{minutes} min fa',
  'format.hoursAgo': '{hours} h fa',
  'format.daysAgo': '{days} g fa',
  'format.startedMinutesAgo': 'Iniziato {minutes} min fa',
  'format.startedHoursAgo': 'Iniziato {hours} h fa',
  'format.startedDaysAgo': 'Iniziato {days} g fa',
  'format.startedOn': 'Iniziato il {date}',
  'format.views': '{count} visualizzazioni',
  'format.subscribers': '{count} iscritti',

  // HelpOverlay
  'help.title': 'Scorciatoie da tastiera',
  'help.section.feed': 'Feed',
  'help.section.player': 'Player (il video attualmente aperto)',
  'help.section.miniplayer': 'Miniplayer (mentre è ancorato)',
  'help.action.nextPrev': 'video successivo / precedente',
  'help.action.play': 'riproduci (apre la schermata del player)',
  'help.action.openByUrl': 'apri un video tramite URL',
  'help.action.openInBrowser': 'apri nel browser',
  'help.action.toggleReadUnread': 'alterna letto / non letto',
  'help.action.ignore': 'ignora (annulla con u)',
  'help.action.ignorePlayer': 'ignora (chiude/ancora il player)',
  'help.action.undoIgnore': 'annulla l’ultimo ignorato',
  'help.action.toggleFavorite': 'alterna preferito',
  'help.action.toggleWatchLater': 'alterna guarda più tardi',
  'help.action.addToPlaylist': 'aggiungi a una playlist',
  'help.action.markAllRead': 'segna tutto come letto (vista attuale)',
  'help.action.toggleLayout': 'alterna vista a griglia / elenco',
  'help.action.topEnd': 'inizio / fine del feed caricato',
  'help.action.switchView': 'cambia vista (Tutti, Non letti, Guarda più tardi, Playlist, Preferiti, Ignorati)',
  'help.action.reload': 'ricarica dai dati locali',
  'help.action.filter': 'filtra nella vista',
  'help.action.findChannel': 'trova canale (barra laterale)',
  'help.action.toggleSidebar': 'mostra/nascondi la barra laterale',
  'help.action.playPause': 'riproduci / pausa',
  'help.action.seek': 'avanti/indietro di 5 s',
  'help.action.toggleLike': 'alterna mi piace',
  'help.action.toggleSubscribe': 'iscriviti / annulla iscrizione al canale',
  'help.action.toggleComments': 'mostra / nascondi i commenti',
  'help.action.nextInQueue': 'successivo in coda (se presente)',
  'help.action.extractWindow': 'apri in una finestra propria sempre in primo piano',
  'help.action.maximizeMiniplayer': 'torna al player completo',
  'help.action.closeMiniplayer': 'chiudi',
  'help.action.thisOverlay': 'questa finestra di aiuto',
  'help.action.backClose': 'indietro / chiudi',

  // Titlebar
  'titlebar.minimize': 'Riduci a icona',
  'titlebar.maximizeRestore': 'Ingrandisci / ripristina',
  'titlebar.close': 'Chiudi',

  // UrlPrompt
  'urlPrompt.title': 'Apri un video di YouTube',
  'urlPrompt.placeholder': 'https://www.youtube.com/watch?v=…',
  'urlPrompt.notice.shorts':
    'Questo è un link Shorts. Chronicle non riproduce mai gli Shorts. Apertura nel browser…',
  'urlPrompt.notice.channelOrPlaylist': 'Per ora i canali e le playlist si aprono nel browser.',
  'urlPrompt.notice.invalid': 'Non sembra un URL di un video di YouTube.',

  // ConnectPanel
  'connect.readError': 'Impossibile leggere il file.',
  'connect.title': 'Collega Chronicle al tuo account YouTube',
  'connect.intro.part1':
    'Chronicle non include credenziali: porti il tuo progetto Google Cloud, così i tuoi dati e la tua quota API appartengono solo a te. La configurazione una tantum richiede circa dieci minuti, vedi',
  'connect.intro.part2':
    'nel repository per la guida passo passo alla creazione del progetto e al download del tuo',
  'connect.intro.part3': '.',
  'connect.step1.title': 'Importa il tuo client OAuth',
  'connect.step1.detailDone': 'client_secret.json importato.',
  'connect.step1.detailPending':
    'Seleziona il file client_secret.json scaricato dalla tua console Google Cloud (tipo App desktop).',
  'connect.step1.buttonDone': 'Sostituisci file…',
  'connect.step1.button': 'Seleziona client_secret.json…',
  'connect.step2.title': 'Autorizza nel tuo browser',
  'connect.step2.detail':
    'Il tuo browser predefinito aprirà la schermata di consenso di Google; Chronicle resta in ascolto localmente (127.0.0.1) per la risposta. I token non lasciano mai questo computer.',
  'connect.step2.buttonConnecting': 'In attesa del browser…',
  'connect.step2.button': 'Connetti Google',
  'connect.storageWarning':
    'Attenzione: non è stato rilevato alcun portachiavi del sistema operativo, quindi il tuo token verrà memorizzato con crittografia locale reversibile; chiunque abbia accesso al tuo account utente potrebbe leggerlo.',

  // SettingsView
  'settings.language.heading': 'Lingua',
  'settings.language.label': 'Lingua',
  'settings.language.system': 'Segui il sistema',
  'settings.language.unreviewedNote': 'Questa traduzione è stata generata dall’IA e non è ancora stata rivista da un madrelingua.',
  'settings.language.unreviewedNoteDetail':
    'Potrebbe contenere errori o frasi poco naturali. Se parli questa lingua, una correzione o una revisione completa è un contributo ben accetto.',
  'settings.connection.heading': 'Connessione',
  'settings.connection.stateConnected': 'Connesso al tuo account Google.',
  'settings.connection.stateDisconnected': 'Chiave API importata, ma non connesso.',
  'settings.connection.stateUnconfigured': 'Nessuna chiave API ancora importata.',
  'settings.connection.scopeGrantedPrefix': 'Ambito concesso:',
  'settings.connection.scopeName.readonly': 'YouTube di sola lettura',
  'settings.connection.scopeName.readonlyPlusWrite': 'YouTube di sola lettura + iscrizione/commento/mi piace',
  'settings.connection.scopeGrantedSuffix.readonly':
    'Usato per elencare le tue iscrizioni e recuperare i metadati dei video. Iscriversi, commentare e mettere mi piace sono disponibili anche dall’interno dell’app; la prima volta che ne usi uno, Chronicle chiederà questo permesso aggiuntivo.',
  'settings.connection.scopeGrantedSuffix.readonlyPlusWrite':
    'Usato per elencare le tue iscrizioni, recuperare i metadati dei video e agire per tuo conto solo per le azioni che compi tu stesso (iscriverti/disiscriverti, commentare, mettere mi piace). Gli stati propri di Chronicle (letto/visto/preferito) restano comunque locali; non vengono mai scritti su YouTube.',
  'settings.connection.revokeLink': 'Revoca in qualsiasi momento ↗',
  'settings.connection.keychainOk': 'La tua chiave e il tuo token sono memorizzati nel portachiavi del sistema.',
  'settings.connection.keychainFallback':
    'Nessun portachiavi del sistema operativo rilevato. Il tuo token è memorizzato con crittografia locale reversibile; chiunque abbia accesso al tuo account utente può leggerlo.',
  'settings.connection.playerSessionNote':
    'Il player incorporato e la chat dal vivo usano una propria sessione del browser separata.',
  'settings.connection.playerSessionNoteDetail':
    'Accedi lì se la riproduzione mostra mai l’avviso di YouTube "Conferma di non essere un robot", o per scrivere in una chat dal vivo; è un passaggio una tantum. È anche qui che si applicherebbe la riproduzione senza pubblicità di YouTube Premium, se hai effettuato l’accesso a Premium.',
  'settings.connection.signInToYouTubeButton': 'Accedi a YouTube',
  'settings.connection.reconnectButton': 'Riconnetti "{account}"',
  'settings.connection.replaceKeyButton': 'Sostituisci chiave API',
  'settings.connection.fixWeeklyLogoutButton': 'Correggi la disconnessione settimanale',
  'settings.connection.signOutButton': 'Disconnetti',
  'settings.sync.heading': 'Sincronizzazione',
  'settings.sync.backgroundRefresh': 'Aggiornamento in background',
  'settings.sync.every15': 'Ogni 15 minuti',
  'settings.sync.every30': 'Ogni 30 minuti',
  'settings.sync.everyHour': 'Ogni ora',
  'settings.sync.manualOnly': 'Solo manuale',
  'settings.sync.note': 'Ricontrolla anche le tue iscrizioni a ogni aggiornamento.',
  'settings.sync.noteDetail':
    'Una nuova iscrizione appare automaticamente alla prossima sincronizzazione; non devi fare nulla qui.',
  'settings.sync.checkForUpdates': 'Controlla aggiornamenti',
  'settings.sync.checkForUpdatesNote':
    'Chronicle {version}. Controlla su GitHub se è disponibile una versione più recente, al massimo una volta al giorno.',
  'settings.sync.checkForUpdatesNoteDetail':
    'Non scarica né installa mai nulla automaticamente; decidi tu dalla pagina della release.',
  'settings.playback.heading': 'Riproduzione',
  'settings.playback.defaultSpeed': 'Velocità predefinita',
  'settings.playback.speedNormal': 'Normale',
  'settings.playback.note': 'Il player si apre già impostato su questa velocità.',
  'settings.playback.noteDetail':
    'Puoi comunque cambiarla per singolo video dai controlli propri del player incorporato; questo non cambia mai questo valore predefinito.',
  'settings.playback.watchLaterAutoRemove': 'Rimuovi da Guarda più tardi all’apertura',
  'settings.playback.watchLaterAutoRemoveNote': 'Rimuove il video dalla coda nel momento in cui lo apri.',
  'settings.playback.watchLaterAutoRemoveNoteDetail':
    'Come deselezionarlo tu stesso. Disattivato per impostazione predefinita, così la coda si riduce solo quando lo decidi tu.',
  'settings.playback.showDislikeEstimate': 'Mostra una stima del numero di "non mi piace"',
  'settings.playback.showDislikeEstimateNote':
    'YouTube ha rimosso il conteggio pubblico dei "non mi piace" nel 2021; il conteggio dei "mi piace" è comunque ancora reale.',
  'settings.playback.showDislikeEstimateNoteDetail':
    'Disattivato per impostazione predefinita. Attivarlo invia l’id di ogni video a returnyoutubedislike.com (un servizio di terze parti gratuito, non YouTube) per ottenere una stima. Non viene inviata nessun’altra informazione su di te.',
  'settings.playback.showDislikeEstimateAttribution': 'Stime dei "non mi piace" fornite da',
  'settings.appearance.heading': 'Aspetto',
  'settings.appearance.theme': 'Tema',
  'settings.appearance.themeSystem': 'Segui il sistema',
  'settings.appearance.themeDark': 'Scuro',
  'settings.appearance.themeLight': 'Chiaro',
  'settings.appearance.showViewCounts': 'Mostra il numero di visualizzazioni',
  'settings.appearance.showShorts': 'Mostra gli Shorts',
  'settings.startup.heading': 'Avvio e background',
  'settings.startup.autoStart': 'Avvia Chronicle automaticamente all’accesso',
  'settings.startup.backgroundMode': 'Continua a funzionare in background alla chiusura della finestra',
  'settings.startup.backgroundModeNote': 'Un’icona nella barra delle applicazioni ti permette di riaprire Chronicle o chiuderlo definitivamente.',
  'settings.startup.backgroundModeNoteDetail':
    'Chiudere la finestra la nasconde soltanto invece di chiudere l’app, così la sincronizzazione (e le notifiche, se attivate qui sotto) continuano in background.',
  'settings.startup.popOutOnClose': 'Estrai il video alla chiusura della finestra',
  'settings.startup.popOutOnCloseNote':
    'Chiudere la finestra estrae invece un video in riproduzione nel player flottante.',
  'settings.startup.popOutOnCloseNoteDetail':
    'Come premere p. Chiudere quel player flottante è ciò che effettivamente lo ferma. Disattiva questa opzione e chiudere la finestra mette in pausa il video invece di estrarlo.',
  'settings.startup.startMinimized': 'Avvia ridotto a icona nella barra delle applicazioni (non aprire la finestra)',
  'settings.startup.startMinimizedNote': 'Si applica solo all’avvio automatico all’accesso.',
  'settings.startup.startMinimizedNoteDetail':
    'Aprire Chronicle tu stesso mostra sempre la finestra, indipendentemente da questa impostazione.',
  'settings.notifications.heading': 'Notifiche',
  'settings.notifications.enabled': 'Avvisami dei nuovi video',
  'settings.notifications.backgroundModeHint': 'Le notifiche si attivano solo mentre Chronicle è in esecuzione.',
  'settings.notifications.backgroundModeHintDetail':
    'Attiva "Esegui in background" qui sopra perché continuino dopo la chiusura della finestra.',
  'settings.notifications.scope': 'Avvisami riguardo',
  'settings.notifications.scopeAll': 'Tutti i canali',
  'settings.notifications.scopeSelected': 'Canali selezionati',
  'settings.notifications.scopeSelectedHint':
    'Attiva o disattiva le notifiche per canale dall’icona accanto ad esso nella barra laterale, o dalla sua pagina del canale.',
  'settings.notifications.notifyShorts': 'Avvisami dei nuovi Shorts',
  'settings.notifications.notifyShortsNote':
    'Disattivato significa che gli Shorts compaiono comunque nel tuo feed, ma senza avvisare.',
  'settings.notifications.notifyShortsNoteDetail':
    'Utile per i canali che ne pubblicano spesso. Gli Shorts nascosti dal feed sopra non avvisano comunque mai.',
  'settings.notifications.autoFavorite': 'Avvisami automaticamente per i canali che metto tra i preferiti',
  'settings.notifications.autoFavoriteNote':
    'Mettere un canale tra i preferiti attiva le notifiche per esso; rimuoverlo dai preferiti le disattiva di nuovo.',
  'settings.notifications.autoFavoriteNoteDetail':
    'A meno che tu non cambi personalmente in seguito lo stato di notifica di quel canale, cosa che viene sempre rispettata.',
  'settings.notifications.autoFavoriteDisableConfirm':
    'Disattivare anche le notifiche per i tuoi canali attualmente preferiti?',
  'settings.notifications.autoFavoriteDisableKeep': 'Lascia così com’è',
  'settings.notifications.autoFavoriteDisableClear': 'Disattiva per i preferiti',
  'settings.data.heading': 'Dati',
  'settings.data.note': 'Tutto ciò che Chronicle sa risiede su questo computer.',
  'settings.data.noteDetail':
    'L’esportazione è un singolo file JSON documentato (FORMAT.md nel repository); puoi andartene con tutto, in qualsiasi momento. Anche il file SQLite stesso è un backup legittimo.',
  'settings.data.exportButton': 'Esporta dati…',
  'settings.data.deleteConfirmButton': 'Fai di nuovo clic per cancellare il database e la tua chiave',
  'settings.data.deleteButton': 'Elimina tutti i dati locali',
  'settings.data.exportedBanner': 'Esportati {videos} video e {states} stati in {path}',
  'settings.data.exportFailedBanner': 'Esportazione non riuscita: {message}',
  'settings.data.storageLine': '{db} database · {cache} cache miniature · {videos} video',

  // Wizard — shared chrome
  'wizard.exitButton': '✕ Chiudi',
  'wizard.screenshot.placeholder':
    'Screenshot in attesa di acquisizione. Il testo a sinistra è la guida completa.',
  'wizard.screenshot.verifiedOn': 'verificato il {date}',
  'wizard.nav.back': '← Indietro',
  'wizard.nav.next': 'Avanti →',
  'wizard.copyRow.copy': 'Copia',
  'wizard.copyRow.copied': 'Copiato ✓',

  // Wizard — WelcomeStep
  'wizard.welcome.heading':
    'Chronicle non ha un server né una chiave API. Ne creerai una tua.',
  'wizard.welcome.intro.pre': 'È gratis, richiede circa',
  'wizard.welcome.intro.strong': '10 minuti, una sola volta',
  'wizard.welcome.intro.post': ', e significa che i tuoi dati e il tuo accesso appartengono solo a te:',
  'wizard.welcome.bullet.quota': 'La tua propria quota API, condivisa con nessuno.',
  'wizard.welcome.bullet.noThirdParty':
    'Nessuna terza parte coinvolta. Gli sviluppatori di Chronicle non accedono mai al tuo account.',
  'wizard.welcome.bullet.revocable': 'Revocabile da te, in qualsiasi momento, nella tua console Google.',
  'wizard.welcome.dim': 'Avrai bisogno di un account Google. Non è richiesto alcun account di fatturazione.',
  'wizard.welcome.startButton': 'Configuriamolo',
  'wizard.welcome.quickPathButton': 'L’ho già fatto prima: importa solo la mia chiave',

  // Wizard — ConsoleStep (shared)
  'wizard.step.heading': 'Passo {label}: {title}',
  'wizard.step.variationsSummary': 'Qualcosa sembra diverso?',

  // Wizard — ConsoleStep: project
  'wizard.step.project.title': 'Crea un progetto Google Cloud',
  'wizard.step.project.why':
    'Google raggruppa l’accesso alle API in "progetti". Te ne serve uno per ospitare la tua chiave. È gratis e non è richiesto alcun account di fatturazione per la quota predefinita dell’API di YouTube.',
  'wizard.step.project.urlLabel': 'Apri la pagina di creazione del progetto',
  'wizard.step.project.copyLabel': 'Nome del progetto suggerito',
  'wizard.step.project.confirmLabel': 'Ho creato il progetto.',
  'wizard.step.project.variations':
    'Se Google chiede un’organizzazione, scegli "Nessuna organizzazione". Se hai già dei progetti, la pagina potrebbe prima mostrare un selettore. Usa "Nuovo progetto".',

  // Wizard — ConsoleStep: enable-api
  'wizard.step.enableApi.title': 'Attiva la YouTube Data API v3',
  'wizard.step.enableApi.why':
    'I progetti partono con tutte le API disattivate; stai attivando solo quella di cui Chronicle ha bisogno: le tue iscrizioni, i metadati dei video e (solo quando scegli di iscriverti, commentare o mettere mi piace) anche quelle azioni.',
  'wizard.step.enableApi.urlLabel': 'Apri la pagina della YouTube Data API',
  'wizard.step.enableApi.confirmLabel': 'Ho cliccato su Attiva.',
  'wizard.step.enableApi.variations':
    'Assicurati che il tuo nuovo progetto sia selezionato nella barra blu in alto prima di cliccare su Attiva. Se il pulsante mostra "Gestisci", l’API è già attiva. Qui hai finito.',

  // Wizard — ConsoleStep: consent
  'wizard.step.consent.title': 'Configura la schermata di consenso OAuth',
  'wizard.step.consent.why':
    'Questa è la schermata dei permessi che vedrai al momento della connessione. Poiché è il tuo progetto, sei sia lo sviluppatore che l’unico utente.',
  'wizard.step.consent.urlLabel': 'Apri le impostazioni della schermata di consenso',
  'wizard.step.consent.copyLabel': 'Nome app suggerito',
  'wizard.step.consent.confirmLabel':
    'Ho configurato la schermata di consenso (Esterno, la mia email in entrambi i campi di contatto).',
  'wizard.step.consent.variations':
    'Tipo di utente: Esterno (Interno esiste solo per le organizzazioni Workspace). Non è necessario aggiungere logo né ambiti. Chronicle richiede il proprio ambito di sola lettura al momento della connessione. Salta tutte le sezioni facoltative. Google a volte rinomina questa pagina "Pubblico" / "Branding" dentro "Google Auth Platform".',

  // Wizard — ConsoleStep: test-user
  'wizard.step.testUser.title': 'Aggiungi te stesso come utente di test',
  'wizard.step.testUser.why':
    'Finché il progetto è in modalità "Test", solo gli utenti di test elencati possono accedere. Quello sei tu.',
  'wizard.step.testUser.urlLabel': 'Apri la schermata di consenso (sezione Utenti di test)',
  'wizard.step.testUser.confirmLabel': 'Ho aggiunto la mia email come utente di test.',
  'wizard.step.testUser.variations':
    'Nel layout più recente di "Google Auth Platform" l’elenco si trova sotto Pubblico → Utenti di test. Usa esattamente l’account Google con cui ti connetterai.',
  'wizard.step.testUser.emailLabel': 'Quale account Google userai?',
  'wizard.step.testUser.emailPlaceholder': 'tu@gmail.com',
  'wizard.step.testUser.copyEmailLabel': 'Copialo per l’elenco degli utenti di test',
  'wizard.step.testUser.emailNote': 'Memorizzato solo su questo computer, solo per questa procedura guidata.',

  // Wizard — ConsoleStep: publish
  'wizard.step.publish.title': 'Pubblica l’app (consigliato)',
  'wizard.step.publish.why':
    'In modalità Test, Google fa scadere la tua connessione ogni 7 giorni. Cliccare su "Pubblica app" rende il tuo token permanente. Potresti vedere un avviso "app non verificata" durante la connessione. È previsto: lo "sviluppatore non verificato" sei tu.',
  'wizard.step.publish.urlLabel': 'Apri la schermata di consenso (Pubblica app)',
  'wizard.step.publish.variations':
    'Pubblicare con il solo ambito di sola lettura di YouTube non richiede la revisione di verifica di Google. Se salti questo passo, Chronicle rileverà la scadenza settimanale e offrirà una riconnessione in due clic, oltre a un link di ritorno a questo passo.',
  'wizard.step.publish.publishedButton': 'L’ho pubblicata',
  'wizard.step.publish.skipButton': 'Salta: accetto di riconnettermi ogni settimana',

  // Wizard — ConsoleStep: client
  'wizard.step.client.title': 'Crea un client OAuth Desktop',
  'wizard.step.client.why':
    'Questo crea il file della chiave effettivo che Chronicle userà. Identifica la tua installazione di Chronicle presso il tuo progetto.',
  'wizard.step.client.urlLabel': 'Apri la pagina delle credenziali',
  'wizard.step.client.copyLabel': 'Nome client suggerito',
  'wizard.step.client.confirmLabel': 'Ho creato il client Desktop e scaricato il file JSON.',
  'wizard.step.client.variations':
    'Crea credenziali → ID client OAuth → il Tipo di applicazione deve essere "App desktop" (non "Applicazione web"). Il download di solito si chiama client_secret_….json e finisce nella tua cartella Download.',

  // Wizard — ImportStep / FileDrop
  'wizard.import.heading': 'Passo 6: Importa il tuo file della chiave',
  'wizard.import.why.part1': 'Seleziona il',
  'wizard.import.why.part2':
    'che hai scaricato. Chronicle estrae la chiave nel portachiavi del tuo sistema. Non lascia mai questo computer e non tocca mai un server.',
  'wizard.import.drop.part1': 'Trascina',
  'wizard.import.drop.part2': 'qui, oppure clicca per selezionarlo',
  'wizard.import.backToClientStep': '← Torna al passo 5 (crea un client Desktop)',
  'wizard.import.okMessage':
    '✓ Chiave importata. Chronicle la memorizza nel portachiavi del tuo sistema, mai online.',
  'wizard.import.okNote':
    'Ora puoi eliminare il file scaricato se vuoi; Chronicle non tocca mai i tuoi file.',
  'wizard.import.storageWarning':
    'Non è stato rilevato alcun portachiavi del sistema operativo, quindi la chiave viene memorizzata con crittografia locale reversibile; chiunque abbia accesso al tuo account utente potrebbe leggerla.',

  // Wizard — ConnectStep
  'wizard.connect.heading': 'Passo 7: Connettiti a Google',
  'wizard.connect.why':
    'Il tuo browser aprirà la schermata di consenso di Google. Chronicle resta in ascolto localmente (127.0.0.1) per la risposta. I token non lasciano mai questo computer.',
  'wizard.connect.warningTitle': 'Attenzione: l’avviso "app non verificata".',
  'wizard.connect.warning.part1': 'Google potrebbe mostrare',
  'wizard.connect.warning.quote': '"Google non ha verificato questa app"',
  'wizard.connect.warning.part2': '. È previsto. Lo sviluppatore non verificato sei',
  'wizard.connect.warning.you': 'tu',
  'wizard.connect.warning.part3': '. Clicca su',
  'wizard.connect.warning.advanced': 'Avanzate',
  'wizard.connect.warning.goUnsafe': 'Vai a Chronicle (non sicuro)',
  'wizard.connect.warning.part4': '. Qui è sicuro perché ti stai fidando del tuo stesso progetto.',
  'wizard.connect.button': 'Connetti Google',
  'wizard.connect.buttonWaiting': 'In attesa del browser…',
  'wizard.connect.apiNotEnabledError': 'La YouTube Data API non è attivata nel tuo progetto.',
  'wizard.connect.testUserHint':
    'Se Google ha bloccato l’accesso, la causa abituale è un utente di test mancante (Passo 4) mentre il progetto è in modalità Test.',
  'wizard.connect.fixItButton': '← Correggi nel passo {step}',
  'wizard.connect.connectedPlain': '✓ Connesso.',
  'wizard.connect.connectedAs': '✓ Connesso come {name}.',
  'wizard.connect.closingNote':
    'Tutto ciò che Chronicle sa è memorizzato su questo computer. La tua chiave può essere revocata in qualsiasi momento su myaccount.google.com/permissions.',
  'wizard.connect.openChronicleButton': 'Apri Chronicle →',

  // App — feed buckets
  'app.bucket.today': 'Oggi',
  'app.bucket.yesterday': 'Ieri',
  'app.bucket.thisWeek': 'Questa settimana',
  'app.bucket.earlier': 'Precedenti',
  'app.bucket.favoriteChannels': 'Dai tuoi canali preferiti',

  // App — banners
  'app.banner.connectionFailed': 'Connessione non riuscita: {message}',
  'app.banner.reconnectRequired':
    'Riconnettiti a Google. La tua autorizzazione è scaduta. (I progetti in modalità Test scadono settimanalmente; pubblicare l’app risolve questo problema in modo permanente.)',
  'app.banner.reconnectAction': 'Riconnetti',
  'app.banner.offline': 'Sembra che tu sia offline. Vengono mostrati i dati locali. L’aggiornamento riproverà.',
  'app.banner.refreshFailed': 'Aggiornamento non riuscito: {message}',
  'app.banner.openVideoFailed': 'Impossibile aprire il video: {message}',
  'app.banner.refreshAllFailed':
    'L’aggiornamento non è riuscito a raggiungere alcun canale ({count} falliti). Controlla la tua connessione. Verrà ritentato al prossimo ciclo.',
  'app.banner.showDetails': 'Dettagli',
  'app.banner.hideDetails': 'Nascondi dettagli',
  'app.banner.showDetailsTitle': 'Mostra quali canali sono falliti e perché',
  'app.banner.failureAccountLevel': 'A livello di account',
  'app.banner.quotaExceeded':
    'Raggiunto il limite giornaliero dell’API. Si ripristina alle {time}, ora locale. Chronicle continua a funzionare con i dati locali; la scoperta tramite RSS continua gratuitamente.',
  'app.banner.signedOut': 'Disconnesso. I dati locali sono stati conservati. Riconnettiti quando vuoi.',
  'app.banner.updateAvailable': 'Chronicle {version} è disponibile.',
  'app.banner.updateAction': 'Vedi la release',
  'app.banner.dismissTitle': 'Ignora',
  'app.banner.newVideos': '{count} nuov{plural} video',
  'app.banner.unsubscribeFailed': 'Impossibile annullare l’iscrizione: {message}',
  'app.banner.searchFailed': 'Ricerca non riuscita: {message}',
  'app.banner.subscribeFailed': 'Impossibile iscriversi: {message}',
  'app.banner.accountConnectFailed': 'Impossibile connettere l’account: {message}',
  'app.banner.accountSyncFailed': 'Impossibile sincronizzare questo account: {message}',
  'app.banner.removeAccountFailed': 'Impossibile rimuovere questo account: {message}',
  'app.banner.videoActionFailed': 'Impossibile farlo: {message}',
  'app.writeScopeDialog.body':
    'Chronicle ha bisogno di un permesso aggiuntivo, una tantum, da Google per questa azione (mi piace, iscrizione o commento). Continuando si aprirà il tuo browser per concederlo.',
  'app.writeScopeDialog.cancel': 'Non ora',
  'app.writeScopeDialog.continue': 'Continua su Google',

  // App — sidebar
  'app.sidebar.showTitle': 'Mostra barra laterale',

  // App — topbar
  'app.topbar.refreshTitle': 'Aggiorna (r)',
  'app.topbar.channelFallback': 'Canale',
  'app.topbar.markAllRead': 'Segna tutto come letto (M)',
  'app.topbar.searchYouTubePlaceholder': 'Cerca',
  'app.topbar.searchChannelPlaceholder': 'Cerca in questo canale',
  'app.topbar.clearFilterTitle': 'Cancella',
  'app.topbar.itemSizeTitle': 'Dimensione elemento: {size}',
  'app.topbar.switchToListView': 'Passa alla vista a elenco (v)',
  'app.topbar.switchToGridView': 'Passa alla vista a griglia (v)',
  'app.topbar.unsubscribe': 'Annulla iscrizione',
  'app.topbar.confirmUnsubscribe': 'Fai di nuovo clic per annullare l’iscrizione',
  'app.topbar.openChannelTitle': 'Apri la pagina YouTube di questo canale',
  'app.topbar.favoriteChannelTitle': 'Preferito: dai priorità in cima al feed principale',
  'app.topbar.unfavoriteChannelTitle': 'Rimuovi dai preferiti',

  // App — status text
  'app.status.filteringShorts': 'identificazione Shorts ({checked} di {total} controllati)…',
  'app.status.checkingChannels': 'controllo di {checked} di {total} canali…',
  'app.status.refreshing': 'aggiornamento…',
  'app.status.caughtUp': 'Tutto aggiornato',
  'app.status.lastRefreshSuffix': ' · ultimo aggiornamento {time}',
  'app.status.unreadCount': '{count} non letti',
  'app.status.checkingChannelsInfo':
    'Controlla i contenuti caricati da ogni canale iscritto alla ricerca di video pubblicati dall’ultima sincronizzazione.',
  'app.status.filteringShortsInfo':
    'Conferma quali dei video appena trovati sono Shorts di YouTube.',
  'app.status.refreshingInfo':
    'Rielenca le tue iscrizioni, poi controlla ogni canale alla ricerca di nuovi video.',

  // App — feed
  'app.feed.emptyFiltered': 'Nulla corrisponde al filtro.',
  'app.feed.emptyNoVideos': 'Ancora niente qui.',

  // FeedList — shared between list rows and grid cards
  'feed.card.undoLabel': 'Ignorato: lascerà questa vista',
  'feed.card.undoButton': 'Annulla (u)',
  'feed.card.undoLabelPlaylist': 'Rimosso dalla playlist: lascerà questo elenco',
  'feed.card.undoButtonPlaylist': 'Annulla',
  'feed.card.favoriteTitle': 'Preferito',
  'feed.card.watchLaterTitle': 'Guarda più tardi',
  'feed.card.toggleReadTitle': 'Alterna letto (m)',
  'feed.card.ignoreTitle': 'Ignora (i)',
  'feed.card.toggleFavoriteTitle': 'Alterna preferito (f)',
  'feed.card.toggleWatchLaterTitle': 'Alterna guarda più tardi (w)',
  'feed.card.openInBrowserTitle': 'Apri nel browser (b)',
  'feed.card.addToPlaylistTitle': 'Aggiungi a una playlist',
  'feed.card.removeFromPlaylistTitle': 'Rimuovi da questa playlist',
  'feed.card.shortBadge': 'Short',
  'feed.card.liveBadge': 'In diretta',
  'feed.card.premiereBadge': 'Anteprima',
  'feed.card.upcomingBadge': 'In arrivo',
  'feed.loadingMore': 'Caricamento…',

  // PlayerView
  'player.topbar.back': '← Indietro',
  'player.topbar.backToFeed': '← Torna al feed',
  'player.miniplayer.maximizeTitle': 'Torna al player completo (e)',
  'player.miniplayer.closeTitle': 'Chiudi (x)',
  'player.extractTitle': 'Apri in una finestra propria sempre in primo piano (p)',
  'player.shareTitle': 'Condividi',
  'player.miniplayer.resizeTitle': 'Trascina per ridimensionare',
  'player.overlay.back': 'Indietro (Esc)',
  'player.overlay.unavailableTitle': 'Questo video non può essere riprodotto qui. Potrebbe essere limitato dal suo creatore, o non più disponibile.',
  'player.overlay.removeFromLibrary': 'Rimuovi dalla libreria',
  'player.overlay.openInBrowser': 'Apri nel browser',
  'player.action.markRead': 'Segna come letto (m)',
  'player.action.markUnread': 'Segna come non letto (m)',
  'player.action.favorite': '☆ Preferito (f)',
  'player.action.favorited': '★ Tra i preferiti (f)',
  'player.action.watchLater': 'Guarda più tardi (w)',
  'player.action.inWatchLater': 'In Guarda più tardi (w)',
  'player.action.subscribe': 'Iscriviti (s)',
  'player.action.subscribed': 'Iscritto (s)',
  'player.action.ignore': 'Ignora (i)',
  'player.action.openInBrowser': 'Apri nel browser (b)',
  'player.action.addToPlaylist': 'Aggiungi a una playlist (a)',
  'player.action.like': 'Mi piace (l)',
  'player.action.liked': 'Ti piace (l)',
  'player.action.dislike': 'Non mi piace',
  'player.action.disliked': 'Non ti piace',
  'player.dislikeEstimate.disabledHint':
    'Il conteggio dei "non mi piace" è stato rimosso da YouTube. Clicca per attivare una stima da un servizio di terze parti in Impostazioni.',
  'player.dislikeEstimate.errorHint':
    'Al momento non è stato possibile caricare la stima dei "non mi piace". Il conteggio dei "mi piace" sopra è comunque ancora reale.',
  'player.description.showMore': 'Mostra di più',
  'player.description.showLess': 'Mostra meno',
  'player.description.shortsLinkTitle': 'Gli Shorts si aprono nel browser (Chronicle non riproduce mai gli Shorts)',
  'player.upNext.label': 'A seguire da Guarda più tardi',
  'player.upNext.labelPlaylist': 'Successivo in {name}',
  'player.upNext.dismiss': 'Ignora',
  'player.chat.toggle': 'Visualizza chat dal vivo',
  'player.chat.extractTitle': 'Apri la chat in una finestra propria',
  'player.chat.signInInfo':
    'La chat dal vivo viene caricata direttamente da YouTube, quindi l’accesso proprio di Chronicle non si trasferisce ad essa. Dovrai accedere qui separatamente, solo una volta.',
  'player.chat.signInHint': 'Vuoi chattare? Dovrai accedere a YouTube anche qui:',
  'player.chat.signInLink': 'Accedi a YouTube',
  'player.chat.signInWindowTitle': 'Accedi per la chat dal vivo',

  // Sidebar
  'sidebar.collapseTitle': 'Comprimi la barra laterale',
  'sidebar.view.all': 'Tutti',
  'sidebar.view.unread': 'Non letti',
  'sidebar.view.watchLater': 'Guarda più tardi',
  'sidebar.view.favorites': 'Preferiti',
  'sidebar.view.playlists': 'Playlist',
  'sidebar.view.ignored': 'Ignorati',
  'sidebar.channelsHeader': 'Canali',
  'sidebar.channelSortTitle': 'Ordina canali',
  'sidebar.channelSort.favorites': 'Preferiti',
  'sidebar.channelSort.recent': 'Recenti',
  'sidebar.channelSort.unread': 'Non letti',
  'sidebar.channelSort.name': 'Nome',
  'sidebar.findChannelPlaceholder': 'Trova canale  c',
  'sidebar.clearTitle': 'Cancella',
  'sidebar.noChannelMatch': 'Nessun canale corrisponde.',
  'sidebar.noChannels': 'Questo account non segue ancora nessun canale.',
  'sidebar.settingsLabel': 'Impostazioni',

  // Sidebar — Accounts
  'sidebar.accountsHeader': 'Account',
  'sidebar.accountDisconnected': 'Riconnessione necessaria',
  'sidebar.addAccount': '+ Aggiungi account',
  'sidebar.accountMenu.title': 'Altro',
  'sidebar.accountMenu.syncNow': 'Sincronizza ora',
  'sidebar.accountMenu.remove': 'Rimuovi account',
  'sidebar.accountMenu.confirmRemove': 'Fai di nuovo clic per rimuovere',
  'sidebar.accountMenu.removeDisabledTitle':
    'L’account principale non può essere rimosso qui. Usa invece Disconnetti nelle Impostazioni',
  'sidebar.channelMenu.title': 'Altro',
  'sidebar.channelMenu.unsubscribe': 'Annulla iscrizione',
  'sidebar.channelMenu.confirmUnsubscribe': 'Fai di nuovo clic per confermare',
  'sidebar.channelMenu.favorite': 'Preferito: dai priorità in cima al feed principale',
  'sidebar.channelMenu.unfavorite': 'Rimuovi dai preferiti',
  'sidebar.channelMenu.notify': 'Avvisami dei nuovi video di questo canale',
  'sidebar.channelMenu.unnotify': 'Smetti di avvisarmi per questo canale',

  // YouTube search
  'search.empty': 'Nessun risultato.',
  'search.searching': 'Ricerca in tutto YouTube…',
  'search.searchingChannel': 'Ricerca in questo canale…',
  'search.channelLoading': 'Caricamento canale…',
  'search.subscribeButton': 'Iscriviti',
  'search.subscribedButton': 'Iscritto',
  'search.videoChannelPrefix': 'su',
  'search.loadingMore': 'Caricamento di altri risultati…',

  // Comments
  'comments.show': 'Mostra commenti (c)',
  'comments.hide': 'Nascondi commenti (c)',
  'comments.loading': 'Caricamento commenti…',
  'comments.loadingMore': 'Caricamento altri commenti…',
  'comments.empty': 'Ancora nessun commento.',
  'comments.reconnectRequired':
    'La tua connessione deve essere rinnovata. Riconnettiti dalle Impostazioni per vedere i commenti.',
  'comments.addPlaceholder': 'Aggiungi un commento…',
  'comments.replyPlaceholder': 'Scrivi una risposta…',
  'comments.postButton': 'Pubblica',
  'comments.posting': 'Pubblicazione…',
  'comments.replyButton': 'Rispondi',
  'comments.openInBrowserTitle': 'Apri il commento nel browser',
  'comments.sortTop': 'Commenti principali',
  'comments.sortNewest': 'Prima i più recenti',
  'comments.editButton': 'Modifica',
  'comments.saveButton': 'Salva',
  'comments.cancelButton': 'Annulla',

  // Add another account
  'addAccount.title': 'Aggiungi un altro account Google',
  'addAccount.instructions':
    'Aggiungi l’email del nuovo account come utente di test nel tuo progetto Google Cloud esistente (lo stesso della tua prima configurazione), quindi connettilo qui sotto.',
  'addAccount.openTestUsersLink': 'Apri le impostazioni degli utenti di test',
  'addAccount.connectButton': 'Connetti account Google',
  'addAccount.connecting': 'In attesa del browser…',
  'addAccount.cancelButton': 'Annulla',

  // Playlists — local-only, never synced to YouTube.
  'playlists.createButton': '+ Nuova playlist',
  'playlists.emptyTitle': 'Ancora nessuna playlist.',
  'playlists.emptyHint': 'Usa "Aggiungi a una playlist" su qualsiasi video per crearne una.',
  'playlists.videoCount': '{count} video',
  'playlists.dialog.createTitle': 'Nuova playlist',
  'playlists.dialog.nameLabel': 'Nome',
  'playlists.dialog.namePlaceholder': 'Nome della playlist',
  'playlists.dialog.descriptionLabel': 'Descrizione',
  'playlists.dialog.descriptionPlaceholder': 'Descrizione (facoltativa)',
  'playlists.dialog.create': 'Crea',
  'playlists.dialog.cancel': 'Annulla',

  // Import a YouTube playlist
  'playlists.importButton': 'Importa da YouTube',
  'playlists.dialog.importTitle': 'Importa una playlist di YouTube',
  'playlists.dialog.urlPlaceholder': 'Incolla l’URL di una playlist di YouTube',
  'playlists.dialog.import': 'Importa',
  'playlists.dialog.importing': 'Importazione…',
  'playlists.dialog.importLog.starting': 'Avvio…',
  'playlists.dialog.importLog.meta': 'Recupero informazioni sulla playlist…',
  'playlists.dialog.importLog.collecting': 'Trovati finora {count} video…',
  'playlists.dialog.importLog.hydrating': 'Importati {count} di {total} video…',
  'playlists.dialog.importLog.stillWorking': 'Ancora in corso: può richiedere tempo per una playlist grande…',
  'playlists.dialog.importLog.done': 'Fatto: importati {imported} di {total} video.',

  // Sync an imported playlist
  'playlists.sync.upToDate': 'Aggiornato',
  'playlists.sync.checkButton': 'Sincronizza',
  'playlists.sync.button': 'Sincronizza ({count} nuovi)',
  'playlists.sync.syncing': 'Sincronizzazione…',

  'playlistDetail.editNameTitle': 'Modifica nome',
  'playlistDetail.editDescriptionTitle': 'Modifica descrizione',
  'playlistDetail.addDescriptionPlaceholder': 'Aggiungi una descrizione…',
  'playlistDetail.saveTitle': 'Salva',
  'playlistDetail.cancelEditTitle': 'Annulla',
  'playlistDetail.deleteButton': 'Elimina playlist',
  'playlistDetail.confirmDelete': 'Fai di nuovo clic per confermare',
  'playlistDetail.empty': 'Questa playlist è vuota.',
  'playlistDetail.emptyHint': 'Usa "Aggiungi a una playlist" su qualsiasi video per aggiungerne uno qui.',

  'addToPlaylist.title': 'Aggiungi a una playlist',
  'addToPlaylist.empty': 'Ancora nessuna playlist. Creane una qui sotto.',
  'addToPlaylist.newPlaylistPlaceholder': 'Nome della nuova playlist',
  'addToPlaylist.create': 'Crea',
  'addToPlaylist.done': 'Fatto',

  'share.title': 'Condividi',
  'share.copy': 'Copia',
  'share.copied': 'Copiato',
  'share.includeTimestamp': 'Includi il timestamp attuale ({time})',
  'share.done': 'Fatto'
}

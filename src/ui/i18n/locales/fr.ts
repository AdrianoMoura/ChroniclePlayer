import type { Dict, LocaleMeta } from '../types'

// This translation was AI-generated and has not yet been reviewed by a
// native speaker — it may contain mistakes or awkward phrasing. If you
// speak French, a correction or a full review is a welcome contribution:
// this is a plain
// Partial<Dict>, so missing/wrong keys don't break anything — t() falls
// back to English for any key missing here. `{name}`-style placeholders
// must stay exactly as in en.ts; only the surrounding text should change.
export const meta: LocaleMeta = { code: 'fr', nativeName: 'Français', reviewed: false }

export const dict: Partial<Dict> = {
  // format.ts
  'format.minutesAgo': 'il y a {minutes} min',
  'format.hoursAgo': 'il y a {hours} h',
  'format.daysAgo': 'il y a {days} j',
  'format.startedMinutesAgo': 'Commencé il y a {minutes} min',
  'format.startedHoursAgo': 'Commencé il y a {hours} h',
  'format.startedDaysAgo': 'Commencé il y a {days} j',
  'format.startedOn': 'Commencé le {date}',
  'format.views': '{count} vues',
  'format.subscribers': '{count} abonnés',

  // HelpOverlay
  'help.title': 'Raccourcis clavier',
  'help.section.feed': 'Flux',
  'help.section.player': 'Lecteur (la vidéo actuellement ouverte)',
  'help.section.miniplayer': 'Mini-lecteur (lorsqu’il est ancré)',
  'help.action.nextPrev': 'vidéo suivante / précédente',
  'help.action.play': 'lire (ouvre l’écran du lecteur)',
  'help.action.openByUrl': 'ouvrir une vidéo par URL',
  'help.action.openInBrowser': 'ouvrir dans le navigateur',
  'help.action.toggleReadUnread': 'basculer lu / non lu',
  'help.action.ignore': 'ignorer (annuler avec u)',
  'help.action.ignorePlayer': 'ignorer (ferme/ancre le lecteur)',
  'help.action.undoIgnore': 'annuler le dernier ignoré',
  'help.action.toggleFavorite': 'basculer favori',
  'help.action.toggleWatchLater': 'basculer à regarder plus tard',
  'help.action.addToPlaylist': 'ajouter à une playlist',
  'help.action.markAllRead': 'tout marquer comme lu (vue actuelle)',
  'help.action.toggleLayout': 'basculer vue grille / liste',
  'help.action.topEnd': 'début / fin du flux chargé',
  'help.action.switchView': 'changer de vue (Tout, Non lus, À regarder plus tard, Playlists, Favoris, Ignorés)',
  'help.action.reload': 'recharger depuis les données locales',
  'help.action.filter': 'filtrer dans la vue',
  'help.action.findChannel': 'rechercher une chaîne (barre latérale)',
  'help.action.toggleSidebar': 'afficher/masquer la barre latérale',
  'help.action.playPause': 'lecture / pause',
  'help.action.seek': 'avancer/reculer de 5 s',
  'help.action.toggleLike': 'basculer j’aime',
  'help.action.toggleSubscribe': 's’abonner / se désabonner de la chaîne',
  'help.action.toggleComments': 'afficher / masquer les commentaires',
  'help.action.nextInQueue': 'suivant dans la file (si une vidéo est en file)',
  'help.action.extractWindow': 'détacher dans sa propre fenêtre toujours au premier plan',
  'help.action.maximizeMiniplayer': 'revenir au lecteur complet',
  'help.action.closeMiniplayer': 'fermer',
  'help.action.thisOverlay': 'cette fenêtre d’aide',
  'help.action.backClose': 'retour / fermer',

  // Titlebar
  'titlebar.minimize': 'Réduire',
  'titlebar.maximizeRestore': 'Agrandir / restaurer',
  'titlebar.close': 'Fermer',

  // UrlPrompt
  'urlPrompt.title': 'Ouvrir une vidéo YouTube',
  'urlPrompt.placeholder': 'https://www.youtube.com/watch?v=…',
  'urlPrompt.notice.shorts':
    'C’est un lien Shorts. Chronicle ne lit jamais les Shorts. Ouverture dans le navigateur…',
  'urlPrompt.notice.channelOrPlaylist': 'Les chaînes et les playlists s’ouvrent pour l’instant dans le navigateur.',
  'urlPrompt.notice.invalid': 'Cela ne ressemble pas à une URL de vidéo YouTube.',

  // ConnectPanel
  'connect.readError': 'Impossible de lire le fichier.',
  'connect.title': 'Connecter Chronicle à votre compte YouTube',
  'connect.intro.part1':
    'Chronicle ne fournit aucun identifiant : vous apportez votre propre projet Google Cloud, de sorte que vos données et votre quota d’API vous appartiennent à vous seul. La configuration unique prend environ dix minutes, voir',
  'connect.intro.part2':
    'dans le dépôt pour le guide étape par étape de création du projet et de téléchargement de votre',
  'connect.intro.part3': '.',
  'connect.step1.title': 'Importez votre client OAuth',
  'connect.step1.detailDone': 'client_secret.json importé.',
  'connect.step1.detailPending':
    'Sélectionnez le fichier client_secret.json téléchargé depuis votre console Google Cloud (type application de bureau).',
  'connect.step1.buttonDone': 'Remplacer le fichier…',
  'connect.step1.button': 'Sélectionner client_secret.json…',
  'connect.step2.title': 'Autorisez dans votre navigateur',
  'connect.step2.detail':
    'Votre navigateur par défaut ouvre l’écran de consentement Google ; Chronicle écoute localement (127.0.0.1) la réponse. Les jetons ne quittent jamais cette machine.',
  'connect.step2.buttonConnecting': 'En attente du navigateur…',
  'connect.step2.button': 'Se connecter avec Google',
  'connect.storageWarning':
    'Attention : aucun trousseau du système n’a été détecté, votre jeton sera donc stocké avec un chiffrement local réversible ; toute personne ayant accès à votre compte utilisateur pourrait le lire.',

  // SettingsView
  'settings.language.heading': 'Langue',
  'settings.language.label': 'Langue',
  'settings.language.system': 'Suivre le système',
  'settings.language.unreviewedNote': 'Cette traduction a été générée par IA et n’a pas encore été relue par un locuteur natif.',
  'settings.language.unreviewedNoteDetail':
    'Elle peut contenir des erreurs ou des tournures peu naturelles. Si vous parlez cette langue, une correction ou une relecture complète est une contribution bienvenue.',
  'settings.connection.heading': 'Connexion',
  'settings.connection.stateConnected': 'Connecté à votre compte Google.',
  'settings.connection.stateDisconnected': 'Clé API importée, mais non connecté.',
  'settings.connection.stateUnconfigured': 'Aucune clé API importée pour l’instant.',
  'settings.connection.scopeGrantedPrefix': 'Portée accordée :',
  'settings.connection.scopeName.readonly': 'YouTube en lecture seule',
  'settings.connection.scopeName.readonlyPlusWrite': 'YouTube en lecture seule + s’abonner/commenter/aimer',
  'settings.connection.scopeGrantedSuffix.readonly':
    'Utilisé pour lister vos abonnements et récupérer les métadonnées des vidéos. S’abonner, commenter et aimer sont aussi disponibles depuis l’application ; la première fois que vous en utilisez un, Chronicle demandera cette permission supplémentaire.',
  'settings.connection.scopeGrantedSuffix.readonlyPlusWrite':
    'Utilisé pour lister vos abonnements, récupérer les métadonnées des vidéos et agir en votre nom uniquement pour les actions que vous effectuez vous-même (s’abonner/se désabonner, commenter, aimer). Les états propres à Chronicle (lu/vu/favori) restent locaux dans tous les cas ; ils ne sont jamais écrits sur YouTube.',
  'settings.connection.revokeLink': 'Révoquer à tout moment ↗',
  'settings.connection.keychainOk': 'Votre clé et votre jeton sont stockés dans le trousseau de votre système.',
  'settings.connection.keychainFallback':
    'Aucun trousseau du système détecté. Votre jeton est stocké avec un chiffrement local réversible ; toute personne ayant accès à votre compte utilisateur peut le lire.',
  'settings.connection.playerSessionNote':
    'Le lecteur intégré et le chat en direct utilisent leur propre session de navigateur distincte.',
  'settings.connection.playerSessionNoteDetail':
    'Connectez-vous là-bas si la lecture affiche jamais le message YouTube « Confirmez que vous n’êtes pas un robot », ou pour écrire dans un chat en direct ; c’est une étape unique. C’est aussi là que s’appliquerait la lecture sans publicité de YouTube Premium, si vous êtes connecté à Premium.',
  'settings.connection.signInToYouTubeButton': 'Se connecter à YouTube',
  'settings.connection.reconnectButton': 'Reconnecter « {account} »',
  'settings.connection.replaceKeyButton': 'Remplacer la clé API',
  'settings.connection.fixWeeklyLogoutButton': 'Corriger la déconnexion hebdomadaire',
  'settings.connection.signOutButton': 'Se déconnecter',
  'settings.sync.heading': 'Synchronisation',
  'settings.sync.backgroundRefresh': 'Actualisation en arrière-plan',
  'settings.sync.every15': 'Toutes les 15 minutes',
  'settings.sync.every30': 'Toutes les 30 minutes',
  'settings.sync.everyHour': 'Toutes les heures',
  'settings.sync.manualOnly': 'Manuel uniquement',
  'settings.sync.note': 'Revérifie aussi vos abonnements à chaque actualisation.',
  'settings.sync.noteDetail':
    'Un nouvel abonnement apparaît automatiquement à la prochaine synchronisation ; vous n’avez rien à faire ici.',
  'settings.sync.checkForUpdates': 'Vérifier les mises à jour',
  'settings.sync.checkForUpdatesNote':
    'Chronicle {version}. Vérifie sur GitHub s’il existe une version plus récente, au plus une fois par jour.',
  'settings.sync.checkForUpdatesNoteDetail':
    'Ne télécharge ni n’installe jamais rien automatiquement ; vous décidez depuis la page de version.',
  'settings.playback.heading': 'Lecture',
  'settings.playback.defaultSpeed': 'Vitesse par défaut',
  'settings.playback.speedNormal': 'Normale',
  'settings.playback.note': 'Le lecteur s’ouvre déjà réglé sur cette vitesse.',
  'settings.playback.noteDetail':
    'Vous pouvez toujours la changer par vidéo depuis les contrôles propres du lecteur intégré ; cela ne change jamais ce réglage par défaut.',
  'settings.playback.watchLaterAutoRemove': 'Retirer de « À regarder plus tard » à l’ouverture',
  'settings.playback.watchLaterAutoRemoveNote': 'Retire la vidéo de la file dès que vous l’ouvrez.',
  'settings.playback.watchLaterAutoRemoveNoteDetail':
    'Comme si vous la décochiez vous-même. Désactivé par défaut, afin que la file ne se réduise que lorsque vous le décidez.',
  'settings.playback.showDislikeEstimate': 'Afficher une estimation du nombre de « je n’aime pas »',
  'settings.playback.showDislikeEstimateNote':
    'YouTube a supprimé le compteur public de « je n’aime pas » en 2021 ; le compteur de « j’aime » reste réel dans tous les cas.',
  'settings.playback.showDislikeEstimateNoteDetail':
    'Désactivé par défaut. L’activer envoie l’identifiant de chaque vidéo à returnyoutubedislike.com (un service tiers gratuit, pas YouTube) pour obtenir une estimation, et renvoie aussi votre propre « j’aime »/« je n’aime pas » comme vote, pour que vous contribuiez les mêmes données que vous lisez. Cela enregistre aussi un identifiant aléatoire et pseudonyme, sans lien avec votre compte Google, utilisé chaque fois que vous aimez, n’aimez pas ou retirez une évaluation.',
  'settings.playback.showDislikeEstimateAttribution': 'Estimations des « je n’aime pas » fournies par',
  'settings.appearance.heading': 'Apparence',
  'settings.appearance.theme': 'Thème',
  'settings.appearance.themeSystem': 'Suivre le système',
  'settings.appearance.themeDark': 'Sombre',
  'settings.appearance.themeLight': 'Clair',
  'settings.appearance.showViewCounts': 'Afficher le nombre de vues',
  'settings.appearance.showShorts': 'Afficher les Shorts',
  'settings.startup.heading': 'Démarrage et arrière-plan',
  'settings.startup.autoStart': 'Démarrer Chronicle automatiquement à la connexion',
  'settings.startup.backgroundMode': 'Continuer à s’exécuter en arrière-plan quand la fenêtre est fermée',
  'settings.startup.backgroundModeNote': 'Une icône dans la zone de notification permet de rouvrir Chronicle ou de le quitter définitivement.',
  'settings.startup.backgroundModeNoteDetail':
    'Fermer la fenêtre se contente de la masquer au lieu de quitter l’application, afin que la synchronisation (et les notifications, si activées ci-dessous) continuent en arrière-plan.',
  'settings.startup.popOutOnClose': 'Détacher la vidéo à la fermeture de la fenêtre',
  'settings.startup.popOutOnCloseNote':
    'Fermer la fenêtre détache plutôt une vidéo en cours de lecture dans le lecteur flottant.',
  'settings.startup.popOutOnCloseNoteDetail':
    'Comme appuyer sur p. Fermer ce lecteur flottant est ce qui l’arrête réellement. Désactivez ceci et fermer la fenêtre met la vidéo en pause au lieu de la détacher.',
  'settings.startup.startMinimized': 'Démarrer minimisé dans la zone de notification (ne pas ouvrir la fenêtre)',
  'settings.startup.startMinimizedNote': 'S’applique uniquement au lancement automatique à la connexion.',
  'settings.startup.startMinimizedNoteDetail':
    'Ouvrir Chronicle vous-même affiche toujours la fenêtre, quel que soit ce réglage.',
  'settings.notifications.heading': 'Notifications',
  'settings.notifications.enabled': 'Me notifier des nouvelles vidéos',
  'settings.notifications.backgroundModeHint': 'Les notifications ne se déclenchent que pendant l’exécution de Chronicle.',
  'settings.notifications.backgroundModeHintDetail':
    'Activez « Exécuter en arrière-plan » ci-dessus pour qu’elles continuent après la fermeture de la fenêtre.',
  'settings.notifications.scope': 'Me notifier à propos de',
  'settings.notifications.scopeAll': 'Toutes les chaînes',
  'settings.notifications.scopeSelected': 'Chaînes sélectionnées',
  'settings.notifications.scopeSelectedHint':
    'Activez ou désactivez les notifications par chaîne depuis l’icône à côté de celle-ci dans la barre latérale, ou depuis sa page de chaîne.',
  'settings.notifications.notifyShorts': 'Me notifier des nouveaux Shorts',
  'settings.notifications.notifyShortsNote':
    'Désactivé signifie que les Shorts apparaissent toujours dans votre flux, mais sans notification.',
  'settings.notifications.notifyShortsNoteDetail':
    'Pratique pour les chaînes qui en publient souvent. Les Shorts masqués du flux ci-dessus ne notifient jamais, dans tous les cas.',
  'settings.notifications.autoFavorite': 'Me notifier automatiquement pour les chaînes que je mets en favori',
  'settings.notifications.autoFavoriteNote':
    'Mettre une chaîne en favori active les notifications pour elle ; la retirer des favoris les désactive à nouveau.',
  'settings.notifications.autoFavoriteNoteDetail':
    'Sauf si vous changez vous-même ensuite l’état de notification de cette chaîne, ce qui est toujours respecté.',
  'settings.notifications.autoFavoriteDisableConfirm':
    'Désactiver aussi les notifications pour vos chaînes actuellement favorites ?',
  'settings.notifications.autoFavoriteDisableKeep': 'Laisser tel quel',
  'settings.notifications.autoFavoriteDisableClear': 'Désactiver pour les favoris',
  'settings.data.heading': 'Données',
  'settings.data.note': 'Tout ce que Chronicle sait réside sur cet ordinateur.',
  'settings.data.noteDetail':
    'L’export est un seul fichier JSON documenté (FORMAT.md dans le dépôt) ; vous pouvez repartir avec tout, à tout moment. Le fichier SQLite lui-même est aussi une sauvegarde légitime.',
  'settings.data.exportButton': 'Exporter les données…',
  'settings.data.deleteConfirmButton': 'Cliquez à nouveau pour effacer la base de données et votre clé',
  'settings.data.deleteButton': 'Supprimer toutes les données locales',
  'settings.data.exportedBanner': '{videos} vidéos et {states} états exportés vers {path}',
  'settings.data.exportFailedBanner': 'Échec de l’export : {message}',
  'settings.data.storageLine': '{db} base de données · {cache} cache de miniatures · {videos} vidéos',

  // Wizard — shared chrome
  'wizard.exitButton': '✕ Fermer',
  'wizard.screenshot.placeholder':
    'Capture d’écran en attente. Le texte de gauche est le guide complet.',
  'wizard.screenshot.verifiedOn': 'vérifié le {date}',
  'wizard.nav.back': '← Retour',
  'wizard.nav.next': 'Suivant →',
  'wizard.copyRow.copy': 'Copier',
  'wizard.copyRow.copied': 'Copié ✓',

  // Wizard — WelcomeStep
  'wizard.welcome.heading':
    'Chronicle n’a ni serveur ni clé API. Vous allez créer la vôtre.',
  'wizard.welcome.intro.pre': 'C’est gratuit, cela prend environ',
  'wizard.welcome.intro.strong': '10 minutes, une seule fois',
  'wizard.welcome.intro.post': ', et cela signifie que vos données et votre accès vous appartiennent à vous seul :',
  'wizard.welcome.bullet.quota': 'Votre propre quota d’API, partagé avec personne.',
  'wizard.welcome.bullet.noThirdParty':
    'Aucun tiers dans la boucle. Les développeurs de Chronicle n’accèdent jamais à votre compte.',
  'wizard.welcome.bullet.revocable': 'Révocable par vous, à tout moment, dans votre propre console Google.',
  'wizard.welcome.dim': 'Vous aurez besoin d’un compte Google. Aucun compte de facturation n’est requis.',
  'wizard.welcome.startButton': 'C’est parti',
  'wizard.welcome.quickPathButton': 'J’ai déjà fait ça : importer juste ma clé',

  // Wizard — ConsoleStep (shared)
  'wizard.step.heading': 'Étape {label} : {title}',
  'wizard.step.variationsSummary': 'Quelque chose semble différent ?',

  // Wizard — ConsoleStep: project
  'wizard.step.project.title': 'Créer un projet Google Cloud',
  'wizard.step.project.why':
    'Google regroupe l’accès à l’API en « projets ». Vous en avez besoin d’un pour héberger votre propre clé. C’est gratuit, et aucun compte de facturation n’est requis pour le quota par défaut de l’API YouTube.',
  'wizard.step.project.urlLabel': 'Ouvrir la page de création de projet',
  'wizard.step.project.copyLabel': 'Nom de projet suggéré',
  'wizard.step.project.confirmLabel': 'J’ai créé le projet.',
  'wizard.step.project.variations':
    'Si Google demande une organisation, choisissez « Aucune organisation ». Si vous avez déjà des projets, la page peut d’abord afficher un sélecteur. Utilisez « Nouveau projet ».',

  // Wizard — ConsoleStep: enable-api
  'wizard.step.enableApi.title': 'Activer l’API YouTube Data v3',
  'wizard.step.enableApi.why':
    'Les projets démarrent avec toutes les API désactivées ; vous activez seulement celle dont Chronicle a besoin : vos abonnements, les métadonnées des vidéos et (seulement quand vous choisissez de vous abonner, commenter ou aimer) ces actions également.',
  'wizard.step.enableApi.urlLabel': 'Ouvrir la page de l’API YouTube Data',
  'wizard.step.enableApi.confirmLabel': 'J’ai cliqué sur Activer.',
  'wizard.step.enableApi.variations':
    'Assurez-vous que votre nouveau projet est sélectionné dans la barre bleue en haut avant de cliquer sur Activer. Si le bouton indique « Gérer », l’API est déjà activée. Vous avez terminé ici.',

  // Wizard — ConsoleStep: consent
  'wizard.step.consent.title': 'Configurer l’écran de consentement OAuth',
  'wizard.step.consent.why':
    'C’est l’écran de permissions que vous verrez lors de la connexion. Comme c’est votre propre projet, vous êtes à la fois le développeur et le seul utilisateur.',
  'wizard.step.consent.urlLabel': 'Ouvrir les paramètres de l’écran de consentement',
  'wizard.step.consent.copyLabel': 'Nom d’application suggéré',
  'wizard.step.consent.confirmLabel':
    'J’ai configuré l’écran de consentement (Externe, mon e-mail dans les deux champs de contact).',
  'wizard.step.consent.variations':
    'Type d’utilisateur : Externe (Interne n’existe que pour les organisations Workspace). Aucun logo ni aucune portée ne doit être ajouté. Chronicle demande sa portée en lecture seule au moment de la connexion. Ignorez toutes les sections optionnelles. Google renomme parfois cette page « Audience » / « Image de marque » dans « Google Auth Platform ».',

  // Wizard — ConsoleStep: test-user
  'wizard.step.testUser.title': 'Vous ajouter vous-même comme utilisateur test',
  'wizard.step.testUser.why':
    'Tant que le projet est en mode « Test », seuls les utilisateurs test répertoriés peuvent se connecter. C’est vous.',
  'wizard.step.testUser.urlLabel': 'Ouvrir l’écran de consentement (section Utilisateurs test)',
  'wizard.step.testUser.confirmLabel': 'J’ai ajouté mon e-mail comme utilisateur test.',
  'wizard.step.testUser.variations':
    'Dans la nouvelle disposition « Google Auth Platform », la liste se trouve sous Audience → Utilisateurs test. Utilisez exactement le compte Google avec lequel vous allez vous connecter.',
  'wizard.step.testUser.emailLabel': 'Quel compte Google allez-vous utiliser ?',
  'wizard.step.testUser.emailPlaceholder': 'vous@gmail.com',
  'wizard.step.testUser.copyEmailLabel': 'Le copier pour la liste des utilisateurs test',
  'wizard.step.testUser.emailNote': 'Stocké uniquement sur cette machine, uniquement pour cet assistant.',

  // Wizard — ConsoleStep: publish
  'wizard.step.publish.title': 'Publier l’application (recommandé)',
  'wizard.step.publish.why':
    'En mode Test, Google fait expirer votre connexion tous les 7 jours. Cliquer sur « Publier l’application » rend votre jeton permanent. Vous pourriez voir un avertissement « application non vérifiée » lors de la connexion. C’est normal : le « développeur non vérifié », c’est vous.',
  'wizard.step.publish.urlLabel': 'Ouvrir l’écran de consentement (Publier l’application)',
  'wizard.step.publish.variations':
    'Publier avec uniquement la portée en lecture seule de YouTube ne nécessite pas de révision de vérification par Google. Si vous ignorez cette étape, Chronicle détectera l’expiration hebdomadaire et proposera une reconnexion en deux clics, ainsi qu’un lien de retour vers cette étape.',
  'wizard.step.publish.publishedButton': 'Je l’ai publiée',
  'wizard.step.publish.skipButton': 'Ignorer : j’accepte de me reconnecter chaque semaine',

  // Wizard — ConsoleStep: client
  'wizard.step.client.title': 'Créer un client OAuth de bureau',
  'wizard.step.client.why':
    'Cela crée le fichier de clé réel que Chronicle utilisera. Il identifie votre installation de Chronicle auprès de votre projet.',
  'wizard.step.client.urlLabel': 'Ouvrir la page des identifiants',
  'wizard.step.client.copyLabel': 'Nom de client suggéré',
  'wizard.step.client.confirmLabel': 'J’ai créé le client de bureau et téléchargé le fichier JSON.',
  'wizard.step.client.variations':
    'Créer des identifiants → ID client OAuth → le type d’application doit être « Application de bureau » (pas « Application Web »). Le téléchargement s’appelle habituellement client_secret_….json et atterrit dans votre dossier Téléchargements.',

  // Wizard — ImportStep / FileDrop
  'wizard.import.heading': 'Étape 6 : Importez votre fichier de clé',
  'wizard.import.why.part1': 'Sélectionnez le',
  'wizard.import.why.part2':
    'que vous avez téléchargé. Chronicle extrait la clé vers le trousseau de votre système. Elle ne quitte jamais cette machine et ne touche jamais un serveur.',
  'wizard.import.drop.part1': 'Déposez',
  'wizard.import.drop.part2': 'ici, ou cliquez pour le choisir',
  'wizard.import.backToClientStep': '← Retour à l’étape 5 (créer un client de bureau)',
  'wizard.import.okMessage':
    '✓ Clé importée. Chronicle la stocke dans le trousseau de votre système, jamais en ligne.',
  'wizard.import.okNote':
    'Vous pouvez maintenant supprimer le fichier téléchargé si vous le souhaitez ; Chronicle ne touche jamais vos fichiers.',
  'wizard.import.storageWarning':
    'Aucun trousseau du système n’a été détecté, la clé est donc stockée avec un chiffrement local réversible ; toute personne ayant accès à votre compte utilisateur pourrait la lire.',

  // Wizard — ConnectStep
  'wizard.connect.heading': 'Étape 7 : Connectez-vous à Google',
  'wizard.connect.why':
    'Votre navigateur ouvrira l’écran de consentement Google. Chronicle écoute localement (127.0.0.1) la réponse. Les jetons ne quittent jamais cette machine.',
  'wizard.connect.warningTitle': 'Attention : l’avertissement « application non vérifiée ».',
  'wizard.connect.warning.part1': 'Google peut afficher',
  'wizard.connect.warning.quote': '« Google n’a pas vérifié cette application »',
  'wizard.connect.warning.part2': '. C’est normal. Le développeur non vérifié, c’est',
  'wizard.connect.warning.you': 'vous',
  'wizard.connect.warning.part3': '. Cliquez sur',
  'wizard.connect.warning.advanced': 'Avancé',
  'wizard.connect.warning.goUnsafe': 'Accéder à Chronicle (non sécurisé)',
  'wizard.connect.warning.part4': '. C’est sans danger ici car vous faites confiance à votre propre projet.',
  'wizard.connect.button': 'Se connecter avec Google',
  'wizard.connect.buttonWaiting': 'En attente du navigateur…',
  'wizard.connect.apiNotEnabledError': 'L’API YouTube Data n’est pas activée dans votre projet.',
  'wizard.connect.testUserHint':
    'Si Google a bloqué la connexion, la cause habituelle est l’absence d’un utilisateur test (étape 4) alors que le projet est en mode Test.',
  'wizard.connect.fixItButton': '← Corriger à l’étape {step}',
  'wizard.connect.connectedPlain': '✓ Connecté.',
  'wizard.connect.connectedAs': '✓ Connecté en tant que {name}.',
  'wizard.connect.closingNote':
    'Tout ce que Chronicle sait est stocké sur cet ordinateur. Votre clé peut être révoquée à tout moment sur myaccount.google.com/permissions.',
  'wizard.connect.openChronicleButton': 'Ouvrir Chronicle →',

  // App — feed buckets
  'app.bucket.today': 'Aujourd’hui',
  'app.bucket.yesterday': 'Hier',
  'app.bucket.thisWeek': 'Cette semaine',
  'app.bucket.earlier': 'Plus tôt',
  'app.bucket.favoriteChannels': 'De vos chaînes favorites',

  // App — banners
  'app.banner.connectionFailed': 'Échec de la connexion : {message}',
  'app.banner.reconnectRequired':
    'Reconnectez-vous à Google. Votre autorisation a expiré. (Les projets en mode Test expirent chaque semaine ; publier l’application corrige cela définitivement.)',
  'app.banner.reconnectAction': 'Se reconnecter',
  'app.banner.offline': 'Vous semblez être hors ligne. Affichage des données locales. L’actualisation réessaiera.',
  'app.banner.refreshFailed': 'Échec de l’actualisation : {message}',
  'app.banner.openVideoFailed': 'Impossible d’ouvrir la vidéo : {message}',
  'app.banner.refreshAllFailed':
    'L’actualisation n’a pu joindre aucune chaîne ({count} ont échoué). Vérifiez votre connexion. Nouvelle tentative au prochain cycle.',
  'app.banner.showDetails': 'Détails',
  'app.banner.hideDetails': 'Masquer les détails',
  'app.banner.showDetailsTitle': 'Afficher quelles chaînes ont échoué et pourquoi',
  'app.banner.failureAccountLevel': 'Au niveau du compte',
  'app.banner.quotaExceeded':
    'Limite quotidienne de l’API atteinte. Elle se réinitialise à {time}, à votre heure locale. Chronicle continue de fonctionner avec les données locales ; la découverte via RSS continue gratuitement.',
  'app.banner.signedOut': 'Déconnecté. Les données locales ont été conservées. Reconnectez-vous à tout moment.',
  'app.banner.updateAvailable': 'Chronicle {version} est disponible.',
  'app.banner.updateAction': 'Voir la version',
  'app.banner.dismissTitle': 'Ignorer',
  'app.banner.newVideos': '{count} nouvelle{plural} vidéo{plural}',
  'app.banner.unsubscribeFailed': 'Impossible de se désabonner : {message}',
  'app.banner.searchFailed': 'Échec de la recherche : {message}',
  'app.banner.subscribeFailed': 'Impossible de s’abonner : {message}',
  'app.banner.accountConnectFailed': 'Impossible de connecter le compte : {message}',
  'app.banner.accountSyncFailed': 'Impossible de synchroniser ce compte : {message}',
  'app.banner.removeAccountFailed': 'Impossible de supprimer ce compte : {message}',
  'app.banner.videoActionFailed': 'Impossible de faire cela : {message}',
  'app.writeScopeDialog.body':
    'Chronicle a besoin d’une permission supplémentaire, unique, de Google pour cette action (j’aime, s’abonner ou commenter). Continuer ouvrira votre navigateur pour l’accorder.',
  'app.writeScopeDialog.cancel': 'Pas maintenant',
  'app.writeScopeDialog.continue': 'Continuer vers Google',

  // App — sidebar
  'app.sidebar.showTitle': 'Afficher la barre latérale',

  // App — topbar
  'app.topbar.refreshTitle': 'Actualiser (r)',
  'app.topbar.channelFallback': 'Chaîne',
  'app.topbar.markAllRead': 'Tout marquer comme lu (M)',
  'app.topbar.searchYouTubePlaceholder': 'Rechercher',
  'app.topbar.searchChannelPlaceholder': 'Rechercher dans cette chaîne',
  'app.topbar.clearFilterTitle': 'Effacer',
  'app.topbar.itemSizeTitle': 'Taille des éléments : {size}',
  'app.topbar.switchToListView': 'Passer en vue liste (v)',
  'app.topbar.switchToGridView': 'Passer en vue grille (v)',
  'app.topbar.unsubscribe': 'Se désabonner',
  'app.topbar.confirmUnsubscribe': 'Cliquez à nouveau pour vous désabonner',
  'app.topbar.openChannelTitle': 'Ouvrir la page YouTube de cette chaîne',
  'app.topbar.favoriteChannelTitle': 'Favori : prioriser en haut du flux principal',
  'app.topbar.unfavoriteChannelTitle': 'Retirer des favoris',

  // App — status text
  'app.status.filteringShorts': 'identification des Shorts ({checked} sur {total} vérifiés)…',
  'app.status.checkingChannels': 'vérification de {checked} sur {total} chaînes…',
  'app.status.refreshing': 'actualisation…',
  'app.status.caughtUp': 'Tout est à jour',
  'app.status.lastRefreshSuffix': ' · dernière actualisation {time}',
  'app.status.unreadCount': '{count} non lues',
  'app.status.checkingChannelsInfo':
    'Vérifie les publications de chaque chaîne abonnée à la recherche de vidéos publiées depuis la dernière synchronisation.',
  'app.status.filteringShortsInfo':
    'Confirme lesquelles des vidéos nouvellement trouvées sont des Shorts YouTube.',
  'app.status.refreshingInfo':
    'Reliste vos abonnements, puis vérifie chaque chaîne à la recherche de nouvelles vidéos.',

  // App — feed
  'app.feed.emptyFiltered': 'Rien ne correspond au filtre.',
  'app.feed.emptyNoVideos': 'Rien ici pour l’instant.',

  // FeedList — shared between list rows and grid cards
  'feed.card.undoLabel': 'Ignorée : elle va quitter cette vue',
  'feed.card.undoButton': 'Annuler (u)',
  'feed.card.undoLabelPlaylist': 'Retirée de la playlist : elle va quitter cette liste',
  'feed.card.undoButtonPlaylist': 'Annuler',
  'feed.card.favoriteTitle': 'Favori',
  'feed.card.watchLaterTitle': 'À regarder plus tard',
  'feed.card.toggleReadTitle': 'Basculer lu (m)',
  'feed.card.ignoreTitle': 'Ignorer (i)',
  'feed.card.toggleFavoriteTitle': 'Basculer favori (f)',
  'feed.card.toggleWatchLaterTitle': 'Basculer à regarder plus tard (w)',
  'feed.card.openInBrowserTitle': 'Ouvrir dans le navigateur (b)',
  'feed.card.addToPlaylistTitle': 'Ajouter à une playlist',
  'feed.card.removeFromPlaylistTitle': 'Retirer de cette playlist',
  'feed.card.shortBadge': 'Short',
  'feed.card.liveBadge': 'En direct',
  'feed.card.premiereBadge': 'Première',
  'feed.card.upcomingBadge': 'À venir',
  'feed.loadingMore': 'Chargement…',

  // PlayerView
  'player.topbar.back': '← Retour',
  'player.topbar.backToFeed': '← Retour au flux',
  'player.miniplayer.maximizeTitle': 'Revenir au lecteur complet (e)',
  'player.miniplayer.closeTitle': 'Fermer (x)',
  'player.extractTitle': 'Détacher dans sa propre fenêtre toujours au premier plan (p)',
  'player.shareTitle': 'Partager',
  'player.miniplayer.resizeTitle': 'Faire glisser pour redimensionner',
  'player.overlay.back': 'Retour (Échap)',
  'player.overlay.unavailableTitle': 'Cette vidéo ne peut pas être lue ici. Elle peut être restreinte par son créateur, ou ne plus être disponible.',
  'player.overlay.removeFromLibrary': 'Retirer de la bibliothèque',
  'player.overlay.openInBrowser': 'Ouvrir dans le navigateur',
  'player.action.markRead': 'Marquer comme lu (m)',
  'player.action.markUnread': 'Marquer comme non lu (m)',
  'player.action.favorite': '☆ Favori (f)',
  'player.action.favorited': '★ Favori (f)',
  'player.action.watchLater': 'À regarder plus tard (w)',
  'player.action.inWatchLater': 'Dans « À regarder plus tard » (w)',
  'player.action.subscribe': 'S’abonner (s)',
  'player.action.subscribed': 'Abonné (s)',
  'player.action.ignore': 'Ignorer (i)',
  'player.action.openInBrowser': 'Ouvrir dans le navigateur (b)',
  'player.action.addToPlaylist': 'Ajouter à une playlist (a)',
  'player.action.like': 'J’aime (l)',
  'player.action.liked': 'Aimé (l)',
  'player.action.dislike': 'Je n’aime pas',
  'player.action.disliked': 'Non aimé',
  'player.dislikeEstimate.disabledHint':
    'Le nombre de « je n’aime pas » a été supprimé par YouTube. Cliquez pour activer une estimation d’un service tiers dans les Paramètres.',
  'player.dislikeEstimate.errorHint':
    'Impossible de charger l’estimation des « je n’aime pas » pour le moment. Le nombre de « j’aime » ci-dessus reste réel.',
  'player.description.showMore': 'Afficher plus',
  'player.description.showLess': 'Afficher moins',
  'player.description.shortsLinkTitle': 'Les Shorts s’ouvrent dans le navigateur (Chronicle ne lit jamais les Shorts)',
  'player.upNext.label': 'À suivre depuis « À regarder plus tard »',
  'player.upNext.labelPlaylist': 'Suivant dans {name}',
  'player.upNext.dismiss': 'Ignorer',
  'player.chat.toggle': 'Voir le chat en direct',
  'player.chat.extractTitle': 'Détacher le chat dans sa propre fenêtre',
  'player.chat.signInInfo':
    'Le chat en direct est chargé directement depuis YouTube, donc la connexion propre de Chronicle ne s’y applique pas. Vous devrez vous connecter ici séparément, une seule fois.',
  'player.chat.signInHint': 'Vous voulez discuter ? Vous devrez aussi vous connecter à YouTube ici :',
  'player.chat.signInLink': 'Se connecter à YouTube',
  'player.chat.signInWindowTitle': 'Connexion pour le chat en direct',

  // Sidebar
  'sidebar.collapseTitle': 'Réduire la barre latérale',
  'sidebar.view.all': 'Tout',
  'sidebar.view.unread': 'Non lus',
  'sidebar.view.watchLater': 'À regarder plus tard',
  'sidebar.view.favorites': 'Favoris',
  'sidebar.view.playlists': 'Playlists',
  'sidebar.view.ignored': 'Ignorés',
  'sidebar.channelsHeader': 'Chaînes',
  'sidebar.channelSortTitle': 'Trier les chaînes',
  'sidebar.channelSort.favorites': 'Favoris',
  'sidebar.channelSort.recent': 'Récent',
  'sidebar.channelSort.unread': 'Non lus',
  'sidebar.channelSort.name': 'Nom',
  'sidebar.findChannelPlaceholder': 'Rechercher une chaîne  c',
  'sidebar.clearTitle': 'Effacer',
  'sidebar.noChannelMatch': 'Aucune chaîne ne correspond.',
  'sidebar.noChannels': 'Ce compte ne suit encore aucune chaîne.',
  'sidebar.settingsLabel': 'Paramètres',

  // Sidebar — Accounts
  'sidebar.accountsHeader': 'Comptes',
  'sidebar.accountDisconnected': 'Reconnexion nécessaire',
  'sidebar.addAccount': '+ Ajouter un compte',
  'sidebar.accountMenu.title': 'Plus',
  'sidebar.accountMenu.syncNow': 'Synchroniser maintenant',
  'sidebar.accountMenu.remove': 'Supprimer le compte',
  'sidebar.accountMenu.confirmRemove': 'Cliquez à nouveau pour supprimer',
  'sidebar.accountMenu.removeDisabledTitle':
    'Le compte principal ne peut pas être supprimé ici. Utilisez plutôt Se déconnecter dans les Paramètres',
  'sidebar.channelMenu.title': 'Plus',
  'sidebar.channelMenu.unsubscribe': 'Se désabonner',
  'sidebar.channelMenu.confirmUnsubscribe': 'Cliquez à nouveau pour confirmer',
  'sidebar.channelMenu.favorite': 'Favori : prioriser en haut du flux principal',
  'sidebar.channelMenu.unfavorite': 'Retirer des favoris',
  'sidebar.channelMenu.notify': 'Me notifier des nouvelles vidéos de cette chaîne',
  'sidebar.channelMenu.unnotify': 'Arrêter de me notifier pour cette chaîne',

  // YouTube search
  'search.empty': 'Aucun résultat.',
  'search.searching': 'Recherche dans tout YouTube…',
  'search.searchingChannel': 'Recherche dans cette chaîne…',
  'search.channelLoading': 'Chargement de la chaîne…',
  'search.subscribeButton': 'S’abonner',
  'search.subscribedButton': 'Abonné',
  'search.videoChannelPrefix': 'sur',
  'search.loadingMore': 'Chargement d’autres résultats…',

  // Comments
  'comments.show': 'Afficher les commentaires (c)',
  'comments.hide': 'Masquer les commentaires (c)',
  'comments.loading': 'Chargement des commentaires…',
  'comments.loadingMore': 'Chargement d’autres commentaires…',
  'comments.empty': 'Pas encore de commentaires.',
  'comments.reconnectRequired':
    'Votre connexion doit être renouvelée. Reconnectez-vous depuis les Paramètres pour voir les commentaires.',
  'comments.addPlaceholder': 'Ajouter un commentaire…',
  'comments.replyPlaceholder': 'Écrire une réponse…',
  'comments.postButton': 'Publier',
  'comments.posting': 'Publication…',
  'comments.replyButton': 'Répondre',
  'comments.openInBrowserTitle': 'Ouvrir le commentaire dans le navigateur',
  'comments.sortTop': 'Meilleurs commentaires',
  'comments.sortNewest': 'Les plus récents en premier',
  'comments.editButton': 'Modifier',
  'comments.saveButton': 'Enregistrer',
  'comments.cancelButton': 'Annuler',

  // Add another account
  'addAccount.title': 'Ajouter un autre compte Google',
  'addAccount.instructions':
    'Ajoutez l’e-mail du nouveau compte comme utilisateur test sur votre projet Google Cloud existant (le même que lors de votre première configuration), puis connectez-le ci-dessous.',
  'addAccount.openTestUsersLink': 'Ouvrir les paramètres des utilisateurs test',
  'addAccount.connectButton': 'Connecter un compte Google',
  'addAccount.connecting': 'En attente du navigateur…',
  'addAccount.cancelButton': 'Annuler',

  // Playlists — local-only, never synced to YouTube.
  'playlists.createButton': '+ Nouvelle playlist',
  'playlists.emptyTitle': 'Pas encore de playlists.',
  'playlists.emptyHint': 'Utilisez « Ajouter à une playlist » sur n’importe quelle vidéo pour en créer une.',
  'playlists.videoCount': '{count} vidéo{plural}',
  'playlists.dialog.createTitle': 'Nouvelle playlist',
  'playlists.dialog.nameLabel': 'Nom',
  'playlists.dialog.namePlaceholder': 'Nom de la playlist',
  'playlists.dialog.descriptionLabel': 'Description',
  'playlists.dialog.descriptionPlaceholder': 'Description (facultatif)',
  'playlists.dialog.create': 'Créer',
  'playlists.dialog.cancel': 'Annuler',

  // Import a YouTube playlist
  'playlists.importButton': 'Importer depuis YouTube',
  'playlists.dialog.importTitle': 'Importer une playlist YouTube',
  'playlists.dialog.urlPlaceholder': 'Collez l’URL d’une playlist YouTube',
  'playlists.dialog.import': 'Importer',
  'playlists.dialog.importing': 'Importation…',
  'playlists.dialog.importLog.starting': 'Démarrage…',
  'playlists.dialog.importLog.meta': 'Récupération des informations de la playlist…',
  'playlists.dialog.importLog.collecting': '{count} vidéos trouvées pour l’instant…',
  'playlists.dialog.importLog.hydrating': '{count} vidéos importées sur {total}…',
  'playlists.dialog.importLog.stillWorking': 'Toujours en cours : cela peut prendre du temps pour une grande playlist…',
  'playlists.dialog.importLog.done': 'Terminé : {imported} vidéos importées sur {total}.',

  // Sync an imported playlist
  'playlists.sync.upToDate': 'À jour',
  'playlists.sync.checkButton': 'Synchroniser',
  'playlists.sync.button': 'Synchroniser ({count} nouvelles)',
  'playlists.sync.syncing': 'Synchronisation…',

  'playlistDetail.editNameTitle': 'Modifier le nom',
  'playlistDetail.editDescriptionTitle': 'Modifier la description',
  'playlistDetail.addDescriptionPlaceholder': 'Ajouter une description…',
  'playlistDetail.saveTitle': 'Enregistrer',
  'playlistDetail.cancelEditTitle': 'Annuler',
  'playlistDetail.deleteButton': 'Supprimer la playlist',
  'playlistDetail.confirmDelete': 'Cliquez à nouveau pour confirmer',
  'playlistDetail.empty': 'Cette playlist est vide.',
  'playlistDetail.emptyHint': 'Utilisez « Ajouter à une playlist » sur n’importe quelle vidéo pour en ajouter une ici.',

  'addToPlaylist.title': 'Ajouter à une playlist',
  'addToPlaylist.empty': 'Pas encore de playlists. Créez-en une ci-dessous.',
  'addToPlaylist.newPlaylistPlaceholder': 'Nom de la nouvelle playlist',
  'addToPlaylist.create': 'Créer',
  'addToPlaylist.done': 'Terminé',

  'share.title': 'Partager',
  'share.copy': 'Copier',
  'share.copied': 'Copié',
  'share.includeTimestamp': 'Inclure l’horodatage actuel ({time})',
  'share.done': 'Terminé'
}

import type { Dict, LocaleMeta } from '../types'

// D-072: AI-generated translation, not yet reviewed by a native speaker — it
// may contain mistakes or awkward phrasing. If you speak Spanish, a
// correction or a full review is a welcome contribution: this is a plain
// Partial<Dict>, so missing/wrong keys don't break anything — t() falls
// back to English for any key missing here. `{name}`-style placeholders
// must stay exactly as in en.ts; only the surrounding text should change.
export const meta: LocaleMeta = { code: 'es', nativeName: 'Español', reviewed: false }

export const dict: Partial<Dict> = {
  // format.ts
  'format.minutesAgo': 'hace {minutes} min',
  'format.hoursAgo': 'hace {hours} h',
  'format.daysAgo': 'hace {days} d',
  'format.startedMinutesAgo': 'Empezó hace {minutes} min',
  'format.startedHoursAgo': 'Empezó hace {hours} h',
  'format.startedDaysAgo': 'Empezó hace {days} d',
  'format.startedOn': 'Empezó el {date}',
  'format.views': '{count} visualizaciones',
  'format.subscribers': '{count} suscriptores',

  // HelpOverlay
  'help.title': 'Atajos de teclado',
  'help.section.feed': 'Feed',
  'help.section.player': 'Reproductor (el vídeo abierto actualmente)',
  'help.section.miniplayer': 'Miniplayer (mientras está anclado)',
  'help.action.nextPrev': 'vídeo siguiente / anterior',
  'help.action.play': 'reproducir (abre la pantalla del reproductor)',
  'help.action.openByUrl': 'abrir un vídeo por URL',
  'help.action.openInBrowser': 'abrir en el navegador',
  'help.action.toggleReadUnread': 'alternar leído / no leído',
  'help.action.ignore': 'ignorar (deshacer con u)',
  'help.action.ignorePlayer': 'ignorar (cierra/ancla el reproductor)',
  'help.action.undoIgnore': 'deshacer el último ignorado',
  'help.action.toggleFavorite': 'alternar favorito',
  'help.action.toggleWatchLater': 'alternar ver más tarde',
  'help.action.addToPlaylist': 'añadir a una lista de reproducción',
  'help.action.markAllRead': 'marcar todo como leído (vista actual)',
  'help.action.toggleLayout': 'alternar vista de cuadrícula / lista',
  'help.action.topEnd': 'inicio / final del feed cargado',
  'help.action.switchView': 'cambiar de vista (Todo, No leídos, Ver más tarde, Listas, Favoritos, Ignorados)',
  'help.action.reload': 'recargar desde los datos locales',
  'help.action.filter': 'filtrar en la vista',
  'help.action.findChannel': 'buscar canal (barra lateral)',
  'help.action.toggleSidebar': 'mostrar/ocultar la barra lateral',
  'help.action.playPause': 'reproducir / pausar',
  'help.action.seek': 'avanzar/retroceder 5 s',
  'help.action.toggleLike': 'alternar me gusta',
  'help.action.toggleSubscribe': 'suscribirse / anular la suscripción al canal',
  'help.action.toggleComments': 'mostrar / ocultar comentarios',
  'help.action.nextInQueue': 'siguiente en la cola (si hay uno en cola)',
  'help.action.extractWindow': 'extraer a su propia ventana siempre visible',
  'help.action.maximizeMiniplayer': 'volver al reproductor completo',
  'help.action.closeMiniplayer': 'cerrar',
  'help.action.thisOverlay': 'esta ventana de ayuda',
  'help.action.backClose': 'atrás / cerrar',

  // Titlebar
  'titlebar.minimize': 'Minimizar',
  'titlebar.maximizeRestore': 'Maximizar / restaurar',
  'titlebar.close': 'Cerrar',

  // UrlPrompt
  'urlPrompt.title': 'Abrir un vídeo de YouTube',
  'urlPrompt.placeholder': 'https://www.youtube.com/watch?v=…',
  'urlPrompt.notice.shorts':
    'Eso es un enlace de Shorts. Chronicle nunca reproduce Shorts. Abriendo en el navegador…',
  'urlPrompt.notice.channelOrPlaylist': 'Los canales y las listas de reproducción se abren en el navegador por ahora.',
  'urlPrompt.notice.invalid': 'Eso no parece una URL de vídeo de YouTube.',

  // ConnectPanel
  'connect.readError': 'No se pudo leer el archivo.',
  'connect.title': 'Conecta Chronicle a tu cuenta de YouTube',
  'connect.intro.part1':
    'Chronicle no incluye credenciales: tú traes tu propio proyecto de Google Cloud, de modo que tus datos y tu cuota de API te pertenecen solo a ti. La configuración única tarda unos diez minutos, consulta',
  'connect.intro.part2':
    'en el repositorio para la guía paso a paso de creación del proyecto y descarga de tu',
  'connect.intro.part3': '.',
  'connect.step1.title': 'Importa tu cliente OAuth',
  'connect.step1.detailDone': 'client_secret.json importado.',
  'connect.step1.detailPending':
    'Selecciona el client_secret.json que descargaste de tu consola de Google Cloud (tipo Aplicación de escritorio).',
  'connect.step1.buttonDone': 'Reemplazar archivo…',
  'connect.step1.button': 'Seleccionar client_secret.json…',
  'connect.step2.title': 'Autoriza en tu navegador',
  'connect.step2.detail':
    'Tu navegador predeterminado abrirá la pantalla de consentimiento de Google; Chronicle escucha localmente (127.0.0.1) la respuesta. Los tokens nunca salen de esta máquina.',
  'connect.step2.buttonConnecting': 'Esperando al navegador…',
  'connect.step2.button': 'Conectar con Google',
  'connect.storageWarning':
    'Atención: no se detectó un llavero del sistema operativo, así que tu token se guardará con cifrado local reversible; cualquiera con acceso a tu cuenta de usuario podría leerlo.',

  // SettingsView
  'settings.language.heading': 'Idioma',
  'settings.language.label': 'Idioma',
  'settings.language.system': 'Seguir el sistema',
  'settings.language.unreviewedNote': 'Esta traducción fue generada por IA y aún no ha sido revisada por un hablante nativo.',
  'settings.language.unreviewedNoteDetail':
    'Puede contener errores o frases poco naturales. Si hablas este idioma, una corrección o una revisión completa es una contribución bienvenida.',
  'settings.connection.heading': 'Conexión',
  'settings.connection.stateConnected': 'Conectado a tu cuenta de Google.',
  'settings.connection.stateDisconnected': 'Clave de API importada, pero no conectada.',
  'settings.connection.stateUnconfigured': 'Aún no se ha importado ninguna clave de API.',
  'settings.connection.scopeGrantedPrefix': 'Alcance concedido:',
  'settings.connection.scopeName.readonly': 'YouTube de solo lectura',
  'settings.connection.scopeName.readonlyPlusWrite': 'YouTube de solo lectura + suscribirse/comentar/me gusta',
  'settings.connection.scopeGrantedSuffix.readonly':
    'Se usa para listar tus suscripciones y obtener los metadatos de los vídeos. Suscribirse, comentar y dar me gusta también están disponibles desde dentro de la app; la primera vez que uses una de esas acciones, Chronicle pedirá este permiso adicional.',
  'settings.connection.scopeGrantedSuffix.readonlyPlusWrite':
    'Se usa para listar tus suscripciones, obtener los metadatos de los vídeos y actuar en tu nombre solo para las acciones que tú mismo realizas (suscribirte/anular la suscripción, comentar, dar me gusta). Los estados propios de Chronicle (leído/visto/favorito) siguen siendo locales en cualquier caso; nunca se escriben en YouTube.',
  'settings.connection.revokeLink': 'Revocar en cualquier momento ↗',
  'settings.connection.keychainOk': 'Tu clave y tu token se guardan en el llavero de tu sistema.',
  'settings.connection.keychainFallback':
    'No se detectó un llavero del sistema operativo. Tu token se guarda con cifrado local reversible; cualquiera con acceso a tu cuenta de usuario puede leerlo.',
  'settings.connection.playerSessionNote':
    'El reproductor incrustado y el chat en vivo usan su propia sesión de navegador independiente.',
  'settings.connection.playerSessionNoteDetail':
    'Inicia sesión ahí si la reproducción muestra alguna vez el aviso de YouTube "Confirma que no eres un robot", o para escribir en un chat en vivo; es un paso único. Aquí también es donde se aplicaría la reproducción sin anuncios de YouTube Premium, si tienes una sesión de Premium iniciada.',
  'settings.connection.signInToYouTubeButton': 'Iniciar sesión en YouTube',
  'settings.connection.reconnectButton': 'Reconectar "{account}"',
  'settings.connection.replaceKeyButton': 'Reemplazar clave de API',
  'settings.connection.fixWeeklyLogoutButton': 'Corregir el cierre de sesión semanal',
  'settings.connection.signOutButton': 'Cerrar sesión',
  'settings.sync.heading': 'Sincronización',
  'settings.sync.backgroundRefresh': 'Actualización en segundo plano',
  'settings.sync.every15': 'Cada 15 minutos',
  'settings.sync.every30': 'Cada 30 minutos',
  'settings.sync.everyHour': 'Cada hora',
  'settings.sync.manualOnly': 'Solo manual',
  'settings.sync.note': 'También vuelve a comprobar tus suscripciones en cada actualización.',
  'settings.sync.noteDetail':
    'Una nueva suscripción aparece automáticamente en la siguiente sincronización; no necesitas hacer nada aquí.',
  'settings.sync.checkForUpdates': 'Buscar actualizaciones',
  'settings.sync.checkForUpdatesNote':
    'Chronicle {version}. Comprueba en GitHub si hay una versión más reciente, como máximo una vez al día.',
  'settings.sync.checkForUpdatesNoteDetail':
    'Nunca descarga ni instala nada automáticamente; tú decides desde la página de la versión.',
  'settings.playback.heading': 'Reproducción',
  'settings.playback.defaultSpeed': 'Velocidad predeterminada',
  'settings.playback.speedNormal': 'Normal',
  'settings.playback.note': 'El reproductor se abre ya con esta velocidad.',
  'settings.playback.noteDetail':
    'Aún puedes cambiarla por vídeo desde los controles propios del reproductor incrustado; eso nunca cambia este valor predeterminado.',
  'settings.playback.watchLaterAutoRemove': 'Quitar de Ver más tarde al abrirlo',
  'settings.playback.watchLaterAutoRemoveNote': 'Quita el vídeo de la cola en el momento en que lo abres.',
  'settings.playback.watchLaterAutoRemoveNoteDetail':
    'Igual que desmarcarlo tú mismo. Desactivado de forma predeterminada, así la cola solo se reduce cuando tú lo decides.',
  'settings.playback.showDislikeEstimate': 'Mostrar una estimación del número de "no me gusta"',
  'settings.playback.showDislikeEstimateNote':
    'YouTube eliminó el contador público de "no me gusta" en 2021; el contador de "me gusta" sigue siendo real en cualquier caso.',
  'settings.playback.showDislikeEstimateNoteDetail':
    'Desactivado de forma predeterminada. Activar esto envía el id de cada vídeo a returnyoutubedislike.com (un servicio gratuito de terceros, no de YouTube) para obtener una estimación. No se envía ninguna otra información sobre ti.',
  'settings.playback.showDislikeEstimateAttribution': 'Estimaciones de "no me gusta" proporcionadas por',
  'settings.appearance.heading': 'Apariencia',
  'settings.appearance.theme': 'Tema',
  'settings.appearance.themeSystem': 'Seguir el sistema',
  'settings.appearance.themeDark': 'Oscuro',
  'settings.appearance.themeLight': 'Claro',
  'settings.appearance.showViewCounts': 'Mostrar número de visualizaciones',
  'settings.appearance.showShorts': 'Mostrar Shorts',
  'settings.startup.heading': 'Inicio y segundo plano',
  'settings.startup.autoStart': 'Iniciar Chronicle automáticamente al iniciar sesión',
  'settings.startup.backgroundMode': 'Seguir ejecutándose en segundo plano al cerrar la ventana',
  'settings.startup.backgroundModeNote': 'Un icono en la bandeja te permite volver a abrir Chronicle o cerrarlo definitivamente.',
  'settings.startup.backgroundModeNoteDetail':
    'Cerrar la ventana solo la oculta en lugar de cerrar la app, así que la sincronización (y las notificaciones, si están activadas abajo) siguen funcionando en segundo plano.',
  'settings.startup.popOutOnClose': 'Extraer el vídeo al cerrar la ventana',
  'settings.startup.popOutOnCloseNote':
    'Cerrar la ventana extrae un vídeo en reproducción al reproductor flotante en su lugar.',
  'settings.startup.popOutOnCloseNoteDetail':
    'Igual que pulsar p. Cerrar ese reproductor flotante es lo que realmente lo detiene. Desactiva esto y, al cerrar la ventana, el vídeo se pausa en lugar de extraerse.',
  'settings.startup.startMinimized': 'Iniciar minimizado en la bandeja (no abrir la ventana)',
  'settings.startup.startMinimizedNote': 'Solo se aplica al inicio automático al iniciar sesión.',
  'settings.startup.startMinimizedNoteDetail':
    'Abrir Chronicle tú mismo siempre muestra la ventana, independientemente de este ajuste.',
  'settings.notifications.heading': 'Notificaciones',
  'settings.notifications.enabled': 'Avisarme sobre vídeos nuevos',
  'settings.notifications.backgroundModeHint': 'Las notificaciones solo se activan mientras Chronicle se está ejecutando.',
  'settings.notifications.backgroundModeHintDetail':
    'Activa "Ejecutar en segundo plano" arriba para que sigan funcionando después de cerrar la ventana.',
  'settings.notifications.scope': 'Avisarme sobre',
  'settings.notifications.scopeAll': 'Todos los canales',
  'settings.notifications.scopeSelected': 'Canales seleccionados',
  'settings.notifications.scopeSelectedHint':
    'Activa o desactiva las notificaciones por canal desde el icono junto a él en la barra lateral, o desde su página de canal.',
  'settings.notifications.notifyShorts': 'Avisarme sobre Shorts nuevos',
  'settings.notifications.notifyShortsNote':
    'Desactivado significa que los Shorts siguen apareciendo en tu feed, pero sin avisar.',
  'settings.notifications.notifyShortsNoteDetail':
    'Útil para canales que publican Shorts con frecuencia. Los Shorts ocultos del feed de arriba nunca avisan, en cualquier caso.',
  'settings.notifications.autoFavorite': 'Avisarme automáticamente de los canales que marco como favoritos',
  'settings.notifications.autoFavoriteNote':
    'Marcar un canal como favorito activa las notificaciones para él; quitarlo de favoritos las vuelve a desactivar.',
  'settings.notifications.autoFavoriteNoteDetail':
    'A menos que tú mismo cambies después el estado de notificación de ese canal, lo cual siempre se respeta.',
  'settings.notifications.autoFavoriteDisableConfirm':
    '¿Desactivar también las notificaciones de tus canales favoritos actuales?',
  'settings.notifications.autoFavoriteDisableKeep': 'Dejar como está',
  'settings.notifications.autoFavoriteDisableClear': 'Desactivar para los favoritos',
  'settings.data.heading': 'Datos',
  'settings.data.note': 'Todo lo que Chronicle sabe reside en este ordenador.',
  'settings.data.noteDetail':
    'La exportación es un único archivo JSON documentado (FORMAT.md en el repositorio); puedes marcharte con todo, en cualquier momento. El propio archivo SQLite también es una copia de seguridad legítima.',
  'settings.data.exportButton': 'Exportar datos…',
  'settings.data.deleteConfirmButton': 'Haz clic de nuevo para borrar la base de datos y tu clave',
  'settings.data.deleteButton': 'Eliminar todos los datos locales',
  'settings.data.exportedBanner': 'Se exportaron {videos} vídeos y {states} estados a {path}',
  'settings.data.exportFailedBanner': 'La exportación falló: {message}',
  'settings.data.storageLine': '{db} base de datos · {cache} caché de miniaturas · {videos} vídeos',

  // Wizard — shared chrome
  'wizard.exitButton': '✕ Cerrar',
  'wizard.screenshot.placeholder':
    'Captura de pantalla pendiente. El texto de la izquierda es la guía completa.',
  'wizard.screenshot.verifiedOn': 'verificado el {date}',
  'wizard.nav.back': '← Atrás',
  'wizard.nav.next': 'Siguiente →',
  'wizard.copyRow.copy': 'Copiar',
  'wizard.copyRow.copied': 'Copiado ✓',

  // Wizard — WelcomeStep
  'wizard.welcome.heading':
    'Chronicle no tiene servidor ni clave de API. Tú crearás la tuya propia.',
  'wizard.welcome.intro.pre': 'Es gratis, tarda unos',
  'wizard.welcome.intro.strong': '10 minutos, una sola vez',
  'wizard.welcome.intro.post': ', y significa que tus datos y tu acceso te pertenecen solo a ti:',
  'wizard.welcome.bullet.quota': 'Tu propia cuota de API, sin compartir con nadie.',
  'wizard.welcome.bullet.noThirdParty':
    'Ningún tercero interviene. Los desarrolladores de Chronicle nunca acceden a tu cuenta.',
  'wizard.welcome.bullet.revocable': 'Revocable por ti, en cualquier momento, desde tu propia consola de Google.',
  'wizard.welcome.dim': 'Necesitarás una cuenta de Google. No se requiere ninguna cuenta de facturación.',
  'wizard.welcome.startButton': 'Vamos a configurarlo',
  'wizard.welcome.quickPathButton': 'Ya he hecho esto antes: solo importar mi clave',

  // Wizard — ConsoleStep (shared)
  'wizard.step.heading': 'Paso {label}: {title}',
  'wizard.step.variationsSummary': '¿Algo se ve diferente?',

  // Wizard — ConsoleStep: project
  'wizard.step.project.title': 'Crea un proyecto de Google Cloud',
  'wizard.step.project.why':
    'Google agrupa el acceso a la API en "proyectos". Necesitas uno para tener tu propia clave. Es gratis y no se requiere ninguna cuenta de facturación para la cuota predeterminada de la API de YouTube.',
  'wizard.step.project.urlLabel': 'Abrir la página de creación de proyectos',
  'wizard.step.project.copyLabel': 'Nombre de proyecto sugerido',
  'wizard.step.project.confirmLabel': 'Creé el proyecto.',
  'wizard.step.project.variations':
    'Si Google pregunta por una organización, elige "Sin organización". Si ya tienes proyectos, la página puede mostrar primero un selector. Usa "Nuevo proyecto".',

  // Wizard — ConsoleStep: enable-api
  'wizard.step.enableApi.title': 'Activa la API de datos de YouTube v3',
  'wizard.step.enableApi.why':
    'Los proyectos empiezan con todas las API desactivadas; vas a activar solo la que Chronicle necesita: tus suscripciones, los metadatos de los vídeos y (solo cuando decidas suscribirte, comentar o dar me gusta) también esas acciones.',
  'wizard.step.enableApi.urlLabel': 'Abrir la página de la API de datos de YouTube',
  'wizard.step.enableApi.confirmLabel': 'Hice clic en Activar.',
  'wizard.step.enableApi.variations':
    'Asegúrate de que tu nuevo proyecto esté seleccionado en la barra azul superior antes de hacer clic en Activar. Si el botón dice "Gestionar", la API ya está activada. Has terminado aquí.',

  // Wizard — ConsoleStep: consent
  'wizard.step.consent.title': 'Configura la pantalla de consentimiento de OAuth',
  'wizard.step.consent.why':
    'Esta es la pantalla de permisos que verás al conectar. Como es tu propio proyecto, eres tanto el desarrollador como el único usuario.',
  'wizard.step.consent.urlLabel': 'Abrir los ajustes de la pantalla de consentimiento',
  'wizard.step.consent.copyLabel': 'Nombre de app sugerido',
  'wizard.step.consent.confirmLabel':
    'Configuré la pantalla de consentimiento (Externa, mi correo en ambos campos de contacto).',
  'wizard.step.consent.variations':
    'Tipo de usuario: Externo (Interno solo existe para organizaciones de Workspace). No es necesario añadir logotipo ni ámbitos. Chronicle solicita su ámbito de solo lectura en el momento de conectar. Omite todas las secciones opcionales. Google a veces renombra esta página como "Audiencia" / "Marca" dentro de "Google Auth Platform".',

  // Wizard — ConsoleStep: test-user
  'wizard.step.testUser.title': 'Añádete a ti mismo como usuario de prueba',
  'wizard.step.testUser.why':
    'Mientras el proyecto esté en modo "Pruebas", solo los usuarios de prueba listados podrán iniciar sesión. Ese eres tú.',
  'wizard.step.testUser.urlLabel': 'Abrir la pantalla de consentimiento (sección Usuarios de prueba)',
  'wizard.step.testUser.confirmLabel': 'Añadí mi correo como usuario de prueba.',
  'wizard.step.testUser.variations':
    'En el diseño más nuevo de "Google Auth Platform" la lista está en Audiencia → Usuarios de prueba. Usa exactamente la cuenta de Google con la que te vas a conectar.',
  'wizard.step.testUser.emailLabel': '¿Qué cuenta de Google vas a usar?',
  'wizard.step.testUser.emailPlaceholder': 'tucorreo@gmail.com',
  'wizard.step.testUser.copyEmailLabel': 'Cópialo para la lista de usuarios de prueba',
  'wizard.step.testUser.emailNote': 'Se guarda solo en esta máquina, solo para este asistente.',

  // Wizard — ConsoleStep: publish
  'wizard.step.publish.title': 'Publica la app (recomendado)',
  'wizard.step.publish.why':
    'En modo Pruebas, Google hace que tu conexión caduque cada 7 días. Hacer clic en "Publicar app" hace que tu token sea permanente. Puede que veas un aviso de "app no verificada" al conectar. Eso es lo esperado: el "desarrollador no verificado" eres tú.',
  'wizard.step.publish.urlLabel': 'Abrir la pantalla de consentimiento (Publicar app)',
  'wizard.step.publish.variations':
    'Publicar con solo el ámbito de solo lectura de YouTube no requiere la revisión de verificación de Google. Si omites esto, Chronicle detectará la caducidad semanal y ofrecerá una reconexión en dos clics, además de un enlace de vuelta a este paso.',
  'wizard.step.publish.publishedButton': 'La publiqué',
  'wizard.step.publish.skipButton': 'Omitir: acepto reconectar semanalmente',

  // Wizard — ConsoleStep: client
  'wizard.step.client.title': 'Crea un cliente OAuth de Escritorio',
  'wizard.step.client.why':
    'Esto crea el archivo de clave real que usará Chronicle. Identifica tu instalación de Chronicle ante tu proyecto.',
  'wizard.step.client.urlLabel': 'Abrir la página de credenciales',
  'wizard.step.client.copyLabel': 'Nombre de cliente sugerido',
  'wizard.step.client.confirmLabel': 'Creé el cliente de Escritorio y descargué el archivo JSON.',
  'wizard.step.client.variations':
    'Crear credenciales → ID de cliente de OAuth → el Tipo de aplicación debe ser "Aplicación de escritorio" (no "Aplicación web"). La descarga suele llamarse client_secret_….json y se guarda en tu carpeta de Descargas.',

  // Wizard — ImportStep / FileDrop
  'wizard.import.heading': 'Paso 6: Importa tu archivo de clave',
  'wizard.import.why.part1': 'Selecciona el',
  'wizard.import.why.part2':
    'que descargaste. Chronicle extrae la clave a tu llavero del sistema. Nunca sale de esta máquina ni toca ningún servidor.',
  'wizard.import.drop.part1': 'Suelta',
  'wizard.import.drop.part2': 'aquí, o haz clic para elegirlo',
  'wizard.import.backToClientStep': '← Volver al paso 5 (crear un cliente de Escritorio)',
  'wizard.import.okMessage':
    '✓ Clave importada. Chronicle la guarda en tu llavero del sistema, nunca en línea.',
  'wizard.import.okNote':
    'Puedes eliminar el archivo descargado ahora si quieres; Chronicle nunca toca tus archivos.',
  'wizard.import.storageWarning':
    'No se detectó un llavero del sistema operativo, así que la clave se guarda con cifrado local reversible; cualquiera con acceso a tu cuenta de usuario podría leerla.',

  // Wizard — ConnectStep
  'wizard.connect.heading': 'Paso 7: Conéctate a Google',
  'wizard.connect.why':
    'Tu navegador abrirá la pantalla de consentimiento de Google. Chronicle escucha localmente (127.0.0.1) la respuesta. Los tokens nunca salen de esta máquina.',
  'wizard.connect.warningTitle': 'Atención: el aviso de "app no verificada".',
  'wizard.connect.warning.part1': 'Google puede mostrar',
  'wizard.connect.warning.quote': '"Google no ha verificado esta app"',
  'wizard.connect.warning.part2': '. Eso es lo esperado. El desarrollador no verificado eres',
  'wizard.connect.warning.you': 'tú',
  'wizard.connect.warning.part3': '. Haz clic en',
  'wizard.connect.warning.advanced': 'Avanzado',
  'wizard.connect.warning.goUnsafe': 'Ir a Chronicle (no seguro)',
  'wizard.connect.warning.part4': '. Es seguro aquí porque estás confiando en tu propio proyecto.',
  'wizard.connect.button': 'Conectar con Google',
  'wizard.connect.buttonWaiting': 'Esperando al navegador…',
  'wizard.connect.apiNotEnabledError': 'La API de datos de YouTube no está activada en tu proyecto.',
  'wizard.connect.testUserHint':
    'Si Google bloqueó el inicio de sesión, la causa habitual es que falte un usuario de prueba (paso 4) mientras el proyecto está en modo Pruebas.',
  'wizard.connect.fixItButton': '← Corregirlo en el paso {step}',
  'wizard.connect.connectedPlain': '✓ Conectado.',
  'wizard.connect.connectedAs': '✓ Conectado como {name}.',
  'wizard.connect.closingNote':
    'Todo lo que Chronicle sabe se guarda en este ordenador. Tu clave se puede revocar en cualquier momento en myaccount.google.com/permissions.',
  'wizard.connect.openChronicleButton': 'Abrir Chronicle →',

  // App — feed buckets
  'app.bucket.today': 'Hoy',
  'app.bucket.yesterday': 'Ayer',
  'app.bucket.thisWeek': 'Esta semana',
  'app.bucket.earlier': 'Anteriores',
  'app.bucket.favoriteChannels': 'De tus canales favoritos',

  // App — banners
  'app.banner.connectionFailed': 'Error de conexión: {message}',
  'app.banner.reconnectRequired':
    'Vuelve a conectar con Google. Tu autorización caducó. (Los proyectos en modo Pruebas caducan semanalmente; publicar la app soluciona esto de forma permanente.)',
  'app.banner.reconnectAction': 'Reconectar',
  'app.banner.offline': 'Parece que estás sin conexión. Mostrando datos locales. Actualizar lo volverá a intentar.',
  'app.banner.refreshFailed': 'La actualización falló: {message}',
  'app.banner.openVideoFailed': 'No se pudo abrir el vídeo: {message}',
  'app.banner.refreshAllFailed':
    'La actualización no pudo contactar con ningún canal ({count} fallaron). Comprueba tu conexión. Se reintentará en el próximo ciclo.',
  'app.banner.showDetails': 'Detalles',
  'app.banner.hideDetails': 'Ocultar detalles',
  'app.banner.showDetailsTitle': 'Mostrar qué canales fallaron y por qué',
  'app.banner.failureAccountLevel': 'A nivel de cuenta',
  'app.banner.quotaExceeded':
    'Se alcanzó el límite diario de la API. Se restablece a las {time} en tu horario. Chronicle sigue funcionando con datos locales; el descubrimiento vía RSS continúa de forma gratuita.',
  'app.banner.signedOut': 'Sesión cerrada. Los datos locales se conservaron. Reconecta cuando quieras.',
  'app.banner.updateAvailable': 'Chronicle {version} está disponible.',
  'app.banner.updateAction': 'Ver la versión',
  'app.banner.dismissTitle': 'Descartar',
  'app.banner.newVideos': '{count} vídeo{plural} nuevo{plural}',
  'app.banner.unsubscribeFailed': 'No se pudo anular la suscripción: {message}',
  'app.banner.searchFailed': 'Error en la búsqueda: {message}',
  'app.banner.subscribeFailed': 'No se pudo suscribir: {message}',
  'app.banner.accountConnectFailed': 'No se pudo conectar la cuenta: {message}',
  'app.banner.accountSyncFailed': 'No se pudo sincronizar esta cuenta: {message}',
  'app.banner.removeAccountFailed': 'No se pudo eliminar esta cuenta: {message}',
  'app.banner.videoActionFailed': 'No se pudo hacer eso: {message}',
  'app.writeScopeDialog.body':
    'Chronicle necesita un permiso adicional, único, de Google para esta acción (me gusta, suscribirse o comentar). Continuar abrirá tu navegador para concederlo.',
  'app.writeScopeDialog.cancel': 'Ahora no',
  'app.writeScopeDialog.continue': 'Continuar a Google',

  // App — sidebar
  'app.sidebar.showTitle': 'Mostrar barra lateral',

  // App — topbar
  'app.topbar.refreshTitle': 'Actualizar (r)',
  'app.topbar.channelFallback': 'Canal',
  'app.topbar.markAllRead': 'Marcar todo como leído (M)',
  'app.topbar.searchYouTubePlaceholder': 'Buscar',
  'app.topbar.searchChannelPlaceholder': 'Buscar en este canal',
  'app.topbar.clearFilterTitle': 'Borrar',
  'app.topbar.itemSizeTitle': 'Tamaño de elemento: {size}',
  'app.topbar.switchToListView': 'Cambiar a vista de lista (v)',
  'app.topbar.switchToGridView': 'Cambiar a vista de cuadrícula (v)',
  'app.topbar.unsubscribe': 'Anular suscripción',
  'app.topbar.confirmUnsubscribe': 'Haz clic de nuevo para anular la suscripción',
  'app.topbar.openChannelTitle': 'Abrir la página de YouTube de este canal',
  'app.topbar.favoriteChannelTitle': 'Favorito: priorizar en la parte superior del feed principal',
  'app.topbar.unfavoriteChannelTitle': 'Quitar de favoritos',

  // App — status text
  'app.status.filteringShorts': 'identificando Shorts ({checked} de {total} comprobados)…',
  'app.status.checkingChannels': 'comprobando {checked} de {total} canales…',
  'app.status.refreshing': 'actualizando…',
  'app.status.caughtUp': 'Todo al día',
  'app.status.lastRefreshSuffix': ' · última actualización {time}',
  'app.status.unreadCount': '{count} no leídos',
  'app.status.checkingChannelsInfo':
    'Comprobando las subidas de cada canal suscrito en busca de vídeos publicados desde la última sincronización.',
  'app.status.filteringShortsInfo':
    'Confirmando cuáles de los vídeos recién encontrados son Shorts de YouTube.',
  'app.status.refreshingInfo':
    'Volviendo a listar tus suscripciones y comprobando después cada canal en busca de vídeos nuevos.',

  // App — feed
  'app.feed.emptyFiltered': 'Nada coincide con el filtro.',
  'app.feed.emptyNoVideos': 'Todavía no hay nada aquí.',

  // FeedList — shared between list rows and grid cards
  'feed.card.undoLabel': 'Ignorado: saldrá de esta vista',
  'feed.card.undoButton': 'Deshacer (u)',
  'feed.card.undoLabelPlaylist': 'Eliminado de la lista de reproducción: saldrá de esta lista',
  'feed.card.undoButtonPlaylist': 'Deshacer',
  'feed.card.favoriteTitle': 'Favorito',
  'feed.card.watchLaterTitle': 'Ver más tarde',
  'feed.card.toggleReadTitle': 'Alternar leído (m)',
  'feed.card.ignoreTitle': 'Ignorar (i)',
  'feed.card.toggleFavoriteTitle': 'Alternar favorito (f)',
  'feed.card.toggleWatchLaterTitle': 'Alternar ver más tarde (w)',
  'feed.card.openInBrowserTitle': 'Abrir en el navegador (b)',
  'feed.card.addToPlaylistTitle': 'Añadir a una lista de reproducción',
  'feed.card.removeFromPlaylistTitle': 'Eliminar de esta lista de reproducción',
  'feed.card.shortBadge': 'Short',
  'feed.card.liveBadge': 'En directo',
  'feed.card.premiereBadge': 'Estreno',
  'feed.card.upcomingBadge': 'Próximamente',
  'feed.loadingMore': 'Cargando más…',

  // PlayerView
  'player.topbar.back': '← Atrás',
  'player.topbar.backToFeed': '← Volver al feed',
  'player.miniplayer.maximizeTitle': 'Volver al reproductor completo (e)',
  'player.miniplayer.closeTitle': 'Cerrar (x)',
  'player.extractTitle': 'Extraer a su propia ventana siempre visible (p)',
  'player.shareTitle': 'Compartir',
  'player.miniplayer.resizeTitle': 'Arrastra para redimensionar',
  'player.overlay.back': 'Atrás (Esc)',
  'player.overlay.unavailableTitle': 'Este vídeo no se puede reproducir aquí. Puede que esté restringido por su creador, o que ya no esté disponible.',
  'player.overlay.removeFromLibrary': 'Eliminar de la biblioteca',
  'player.overlay.openInBrowser': 'Abrir en el navegador',
  'player.action.markRead': 'Marcar como leído (m)',
  'player.action.markUnread': 'Marcar como no leído (m)',
  'player.action.favorite': '☆ Favorito (f)',
  'player.action.favorited': '★ En favoritos (f)',
  'player.action.watchLater': 'Ver más tarde (w)',
  'player.action.inWatchLater': 'En Ver más tarde (w)',
  'player.action.subscribe': 'Suscribirse (s)',
  'player.action.subscribed': 'Suscrito (s)',
  'player.action.ignore': 'Ignorar (i)',
  'player.action.openInBrowser': 'Abrir en el navegador (b)',
  'player.action.addToPlaylist': 'Añadir a una lista (a)',
  'player.action.like': 'Me gusta (l)',
  'player.action.liked': 'Te gusta (l)',
  'player.action.dislike': 'No me gusta',
  'player.action.disliked': 'No te gusta',
  'player.dislikeEstimate.disabledHint':
    'YouTube eliminó el contador de "no me gusta". Haz clic para activar una estimación de un servicio de terceros en Ajustes.',
  'player.dislikeEstimate.errorHint':
    'No se pudo cargar la estimación de "no me gusta" ahora mismo. El contador de "me gusta" de arriba sigue siendo real.',
  'player.description.showMore': 'Mostrar más',
  'player.description.showLess': 'Mostrar menos',
  'player.description.shortsLinkTitle': 'Los Shorts se abren en el navegador (Chronicle nunca reproduce Shorts)',
  'player.upNext.label': 'A continuación, de Ver más tarde',
  'player.upNext.labelPlaylist': 'Siguiente en {name}',
  'player.upNext.dismiss': 'Descartar',
  'player.chat.toggle': 'Ver chat en vivo',
  'player.chat.extractTitle': 'Extraer el chat a su propia ventana',
  'player.chat.signInInfo':
    'El chat en vivo se carga directamente desde YouTube, así que el inicio de sesión propio de Chronicle no se traslada a él. Tendrás que iniciar sesión aquí por separado, solo una vez.',
  'player.chat.signInHint': '¿Quieres chatear? Tendrás que iniciar sesión en YouTube aquí también:',
  'player.chat.signInLink': 'Iniciar sesión en YouTube',
  'player.chat.signInWindowTitle': 'Inicia sesión para el chat en vivo',

  // Sidebar
  'sidebar.collapseTitle': 'Contraer la barra lateral',
  'sidebar.view.all': 'Todo',
  'sidebar.view.unread': 'No leídos',
  'sidebar.view.watchLater': 'Ver más tarde',
  'sidebar.view.favorites': 'Favoritos',
  'sidebar.view.playlists': 'Listas de reproducción',
  'sidebar.view.ignored': 'Ignorados',
  'sidebar.channelsHeader': 'Canales',
  'sidebar.channelSortTitle': 'Ordenar canales',
  'sidebar.channelSort.favorites': 'Favoritos',
  'sidebar.channelSort.recent': 'Recientes',
  'sidebar.channelSort.unread': 'No leídos',
  'sidebar.channelSort.name': 'Nombre',
  'sidebar.findChannelPlaceholder': 'Buscar canal  c',
  'sidebar.clearTitle': 'Borrar',
  'sidebar.noChannelMatch': 'Ningún canal coincide.',
  'sidebar.noChannels': 'Esta cuenta aún no sigue ningún canal.',
  'sidebar.settingsLabel': 'Ajustes',

  // Sidebar — Accounts (B-003)
  'sidebar.accountsHeader': 'Cuentas',
  'sidebar.accountDisconnected': 'Requiere reconexión',
  'sidebar.addAccount': '+ Añadir cuenta',
  'sidebar.accountMenu.title': 'Más',
  'sidebar.accountMenu.syncNow': 'Sincronizar ahora',
  'sidebar.accountMenu.remove': 'Eliminar cuenta',
  'sidebar.accountMenu.confirmRemove': 'Haz clic de nuevo para eliminar',
  'sidebar.accountMenu.removeDisabledTitle':
    'La cuenta principal no se puede eliminar aquí. Usa Cerrar sesión en Ajustes en su lugar',
  'sidebar.channelMenu.title': 'Más',
  'sidebar.channelMenu.unsubscribe': 'Anular suscripción',
  'sidebar.channelMenu.confirmUnsubscribe': 'Haz clic de nuevo para confirmar',
  'sidebar.channelMenu.favorite': 'Favorito: priorizar en la parte superior del feed principal',
  'sidebar.channelMenu.unfavorite': 'Quitar de favoritos',
  'sidebar.channelMenu.notify': 'Avisarme sobre vídeos nuevos de este canal',
  'sidebar.channelMenu.unnotify': 'Dejar de avisarme sobre este canal',

  // YouTube search (B-009)
  'search.empty': 'Sin resultados.',
  'search.searching': 'Buscando en todo YouTube…',
  'search.searchingChannel': 'Buscando en este canal…',
  'search.channelLoading': 'Cargando canal…',
  'search.subscribeButton': 'Suscribirse',
  'search.subscribedButton': 'Suscrito',
  'search.videoChannelPrefix': 'en',
  'search.loadingMore': 'Cargando más resultados…',

  // Comments (B-006)
  'comments.show': 'Mostrar comentarios (c)',
  'comments.hide': 'Ocultar comentarios (c)',
  'comments.loading': 'Cargando comentarios…',
  'comments.loadingMore': 'Cargando más comentarios…',
  'comments.empty': 'Todavía no hay comentarios.',
  'comments.reconnectRequired':
    'Tu conexión necesita renovarse. Vuelve a conectar desde Ajustes para ver los comentarios.',
  'comments.addPlaceholder': 'Añade un comentario…',
  'comments.replyPlaceholder': 'Escribe una respuesta…',
  'comments.postButton': 'Publicar',
  'comments.posting': 'Publicando…',
  'comments.replyButton': 'Responder',
  'comments.openInBrowserTitle': 'Abrir el comentario en el navegador',
  'comments.sortTop': 'Comentarios destacados',
  'comments.sortNewest': 'Más recientes primero',
  'comments.editButton': 'Editar',
  'comments.saveButton': 'Guardar',
  'comments.cancelButton': 'Cancelar',

  // Add another account (B-003)
  'addAccount.title': 'Añadir otra cuenta de Google',
  'addAccount.instructions':
    'Añade el correo de la nueva cuenta como usuario de prueba en tu proyecto de Google Cloud existente (el mismo de tu primera configuración) y luego conéctala abajo.',
  'addAccount.openTestUsersLink': 'Abrir los ajustes de usuarios de prueba',
  'addAccount.connectButton': 'Conectar cuenta de Google',
  'addAccount.connecting': 'Esperando al navegador…',
  'addAccount.cancelButton': 'Cancelar',

  // Playlists — local-only, never synced to YouTube.
  'playlists.createButton': '+ Nueva lista de reproducción',
  'playlists.emptyTitle': 'Todavía no hay listas de reproducción.',
  'playlists.emptyHint': 'Usa "Añadir a una lista" en cualquier vídeo para crear una.',
  'playlists.videoCount': '{count} vídeo{plural}',
  'playlists.dialog.createTitle': 'Nueva lista de reproducción',
  'playlists.dialog.nameLabel': 'Nombre',
  'playlists.dialog.namePlaceholder': 'Nombre de la lista de reproducción',
  'playlists.dialog.descriptionLabel': 'Descripción',
  'playlists.dialog.descriptionPlaceholder': 'Descripción (opcional)',
  'playlists.dialog.create': 'Crear',
  'playlists.dialog.cancel': 'Cancelar',

  // Import a YouTube playlist (D-059)
  'playlists.importButton': 'Importar desde YouTube',
  'playlists.dialog.importTitle': 'Importar una lista de reproducción de YouTube',
  'playlists.dialog.urlPlaceholder': 'Pega la URL de una lista de reproducción de YouTube',
  'playlists.dialog.import': 'Importar',
  'playlists.dialog.importing': 'Importando…',
  'playlists.dialog.importLog.starting': 'Iniciando…',
  'playlists.dialog.importLog.meta': 'Obteniendo información de la lista de reproducción…',
  'playlists.dialog.importLog.collecting': 'Encontrados {count} vídeos hasta ahora…',
  'playlists.dialog.importLog.hydrating': 'Importados {count} de {total} vídeos…',
  'playlists.dialog.importLog.stillWorking': 'Aún trabajando: esto puede tardar para una lista de reproducción grande…',
  'playlists.dialog.importLog.done': 'Listo: se importaron {imported} de {total} vídeos.',

  // Sync an imported playlist (D-059)
  'playlists.sync.upToDate': 'Al día',
  'playlists.sync.checkButton': 'Sincronizar',
  'playlists.sync.button': 'Sincronizar ({count} nuevos)',
  'playlists.sync.syncing': 'Sincronizando…',

  'playlistDetail.editNameTitle': 'Editar nombre',
  'playlistDetail.editDescriptionTitle': 'Editar descripción',
  'playlistDetail.addDescriptionPlaceholder': 'Añadir una descripción…',
  'playlistDetail.saveTitle': 'Guardar',
  'playlistDetail.cancelEditTitle': 'Cancelar',
  'playlistDetail.deleteButton': 'Eliminar lista de reproducción',
  'playlistDetail.confirmDelete': 'Haz clic de nuevo para confirmar',
  'playlistDetail.empty': 'Esta lista de reproducción está vacía.',
  'playlistDetail.emptyHint': 'Usa "Añadir a una lista" en cualquier vídeo para añadir uno aquí.',

  'addToPlaylist.title': 'Añadir a una lista de reproducción',
  'addToPlaylist.empty': 'Todavía no hay listas de reproducción. Crea una abajo.',
  'addToPlaylist.newPlaylistPlaceholder': 'Nombre de la nueva lista de reproducción',
  'addToPlaylist.create': 'Crear',
  'addToPlaylist.done': 'Hecho',

  'share.title': 'Compartir',
  'share.copy': 'Copiar',
  'share.copied': 'Copiado',
  'share.includeTimestamp': 'Incluir la marca de tiempo actual ({time})',
  'share.done': 'Hecho'
}

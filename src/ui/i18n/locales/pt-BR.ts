import type { Dict, LocaleMeta } from '../types'

// D-054: community-contributed translation, kept as a Partial<Dict> so it
// can lag behind new English keys without breaking the build — t() falls
// back to English for any key missing here. `{name}` placeholders must stay
// exactly as in en.ts; only the surrounding text is translated.
export const meta: LocaleMeta = { code: 'pt-BR', nativeName: 'Português (Brasil)' }

export const dict: Partial<Dict> = {
  // format.ts
  'format.minutesAgo': 'há {minutes} min',
  'format.hoursAgo': 'há {hours} h',
  'format.daysAgo': 'há {days} d',
  'format.startedMinutesAgo': 'Começou há {minutes} min',
  'format.startedHoursAgo': 'Começou há {hours} h',
  'format.startedDaysAgo': 'Começou há {days} d',
  'format.startedOn': 'Começou em {date}',
  'format.views': '{count} visualizações',
  'format.subscribers': '{count} inscritos',

  // HelpOverlay
  'help.title': 'Atalhos de teclado',
  'help.section.feed': 'Feed',
  'help.section.player': 'Player (o vídeo aberto no momento)',
  'help.section.miniplayer': 'Miniplayer (enquanto ancorado)',
  'help.action.nextPrev': 'próximo / vídeo anterior',
  'help.action.play': 'reproduzir (abre a tela do player)',
  'help.action.openByUrl': 'abrir um vídeo por URL',
  'help.action.openInBrowser': 'abrir no navegador',
  'help.action.toggleReadUnread': 'alternar lido / não lido',
  'help.action.ignore': 'ignorar (desfazer com u)',
  'help.action.ignorePlayer': 'ignorar (fecha/ancora o player)',
  'help.action.undoIgnore': 'desfazer o último ignorado',
  'help.action.toggleFavorite': 'alternar favorito',
  'help.action.toggleWatchLater': 'alternar assistir mais tarde',
  'help.action.markAllRead': 'marcar tudo como lido (view atual)',
  'help.action.toggleLayout': 'alternar visualização em grade / lista',
  'help.action.topEnd': 'início / fim do feed carregado',
  'help.action.switchView':
    'trocar de view (Todos, Não lidos, Assistir depois, Favoritos, Ignorados)',
  'help.action.reload': 'recarregar a partir dos dados locais',
  'help.action.filter': 'filtrar na view',
  'help.action.findChannel': 'buscar canal (barra lateral)',
  'help.action.toggleSidebar': 'mostrar/ocultar barra lateral',
  'help.action.playPause': 'reproduzir / pausar',
  'help.action.seek': 'avançar/voltar ±5s',
  'help.action.toggleLike': 'alternar curtir',
  'help.action.toggleSubscribe': 'inscrever-se / cancelar inscrição no canal',
  'help.action.toggleComments': 'mostrar / ocultar comentários',
  'help.action.nextInQueue': 'próximo da fila (quando houver um na fila)',
  'help.action.extractWindow': 'destacar em janela própria sempre visível',
  'help.action.maximizeMiniplayer': 'voltar ao player completo',
  'help.action.closeMiniplayer': 'fechar',
  'help.action.thisOverlay': 'esta janela de atalhos',
  'help.action.backClose': 'voltar / fechar',

  // Titlebar
  'titlebar.minimize': 'Minimizar',
  'titlebar.maximizeRestore': 'Maximizar / restaurar',
  'titlebar.close': 'Fechar',

  // UrlPrompt
  'urlPrompt.title': 'Abrir um vídeo do YouTube',
  'urlPrompt.placeholder': 'https://www.youtube.com/watch?v=…',
  'urlPrompt.notice.shorts':
    'Esse é um link de Shorts — o Chronicle nunca reproduz Shorts. Abrindo no navegador…',
  'urlPrompt.notice.channelOrPlaylist': 'Canais e playlists abrem no navegador por enquanto.',
  'urlPrompt.notice.invalid': 'Isso não parece ser uma URL de vídeo do YouTube.',

  // ConnectPanel
  'connect.readError': 'Não foi possível ler o arquivo.',
  'connect.title': 'Conecte o Chronicle à sua conta do YouTube',
  'connect.intro.part1':
    'O Chronicle não vem com credenciais: você usa seu próprio projeto do Google Cloud, então seus dados e sua cota de API pertencem só a você. A configuração única leva cerca de dez minutos — veja',
  'connect.intro.part2': 'no repositório para o guia passo a passo de criar o projeto e baixar seu',
  'connect.intro.part3': '.',
  'connect.step1.title': 'Importe seu cliente OAuth',
  'connect.step1.detailDone': 'client_secret.json importado.',
  'connect.step1.detailPending':
    'Selecione o client_secret.json que você baixou do seu console do Google Cloud (tipo Desktop app).',
  'connect.step1.buttonDone': 'Substituir arquivo…',
  'connect.step1.button': 'Selecionar client_secret.json…',
  'connect.step2.title': 'Autorize no seu navegador',
  'connect.step2.detail':
    'Seu navegador padrão abre a tela de consentimento do Google; o Chronicle escuta localmente (127.0.0.1) pela resposta. Os tokens nunca saem desta máquina.',
  'connect.step2.buttonConnecting': 'Aguardando o navegador…',
  'connect.step2.button': 'Conectar com o Google',
  'connect.storageWarning':
    'Atenção: nenhum chaveiro do sistema foi detectado, então seu token será guardado com criptografia local reversível — qualquer pessoa com acesso à sua conta de usuário poderia lê-lo.',

  // SettingsView
  'settings.language.heading': 'Idioma',
  'settings.language.label': 'Idioma',
  'settings.language.system': 'Seguir o sistema',
  'settings.connection.heading': 'Conexão',
  'settings.connection.stateConnected': 'Conectado à sua conta do Google.',
  'settings.connection.stateDisconnected': 'Chave de API importada, mas não conectada.',
  'settings.connection.stateUnconfigured': 'Nenhuma chave de API importada ainda.',
  'settings.connection.scopeGrantedPrefix': 'Permissão concedida:',
  'settings.connection.scopeName.readonly': 'YouTube somente leitura',
  'settings.connection.scopeName.readonlyPlusWrite':
    'YouTube somente leitura + inscrever-se/comentar/curtir',
  'settings.connection.scopeGrantedSuffix.readonly':
    '— usada para listar suas inscrições e buscar metadados dos vídeos. Inscrever-se, comentar e curtir também estão disponíveis dentro do app; na primeira vez que você usar uma dessas ações, o Chronicle vai pedir essa permissão adicional.',
  'settings.connection.scopeGrantedSuffix.readonlyPlusWrite':
    '— usada para listar suas inscrições, buscar metadados dos vídeos e agir em seu nome apenas para ações que você mesmo realiza (inscrever-se/cancelar inscrição, comentar, curtir). Os estados próprios do Chronicle (lido/assistir depois/favorito) continuam locais de qualquer forma, nunca são escritos no YouTube.',
  'settings.connection.revokeLink': 'Revogar quando quiser ↗',
  'settings.connection.keychainOk': 'Sua chave e seu token estão guardados no chaveiro do sistema.',
  'settings.connection.keychainFallback':
    'Nenhum chaveiro do sistema detectado: seu token é guardado com criptografia local reversível — qualquer pessoa com acesso à sua conta de usuário pode lê-lo.',
  'settings.connection.playerSessionNote':
    'O player incorporado — e o chat ao vivo de um vídeo, também um embed do YouTube — usam sua própria sessão de navegador, separada da conexão com o Google acima. Entre por lá se a reprodução mostrar a tela do YouTube "Confirme que você não é um robô", ou para conseguir comentar no chat ao vivo; é só uma vez. É também ali que a reprodução sem anúncios do YouTube Premium se aplicaria, caso você esteja conectado ao Premium.',
  'settings.connection.signInToYouTubeButton': 'Entrar no YouTube',
  'settings.connection.reconnectButton': 'Reconectar "{account}"',
  'settings.connection.replaceKeyButton': 'Substituir chave de API',
  'settings.connection.fixWeeklyLogoutButton': 'Corrigir logout semanal',
  'settings.connection.signOutButton': 'Sair',
  'settings.sync.heading': 'Sincronização',
  'settings.sync.backgroundRefresh': 'Atualização em segundo plano',
  'settings.sync.every15': 'A cada 15 minutos',
  'settings.sync.every30': 'A cada 30 minutos',
  'settings.sync.everyHour': 'A cada hora',
  'settings.sync.manualOnly': 'Somente manual',
  'settings.sync.note':
    'Toda atualização também reconfere sua lista de inscrições, então uma nova inscrição aparece já na próxima sincronização — nada a fazer aqui.',
  'settings.sync.checkForUpdates': 'Verificar atualizações',
  'settings.sync.checkForUpdatesNote':
    'Chronicle {version} — verifica no GitHub se há uma versão mais nova, no máximo uma vez por dia. Nunca baixa nem instala nada sozinho; você decide a partir da página de lançamento.',
  'settings.playback.heading': 'Reprodução',
  'settings.playback.defaultSpeed': 'Velocidade padrão',
  'settings.playback.speedNormal': 'Normal',
  'settings.playback.note':
    'O player já abre nessa velocidade. Você ainda pode mudá-la por vídeo pelos próprios controles do player — isso nunca altera este padrão.',
  'settings.appearance.heading': 'Aparência',
  'settings.appearance.theme': 'Tema',
  'settings.appearance.themeSystem': 'Seguir o sistema',
  'settings.appearance.themeDark': 'Escuro',
  'settings.appearance.themeLight': 'Claro',
  'settings.appearance.showViewCounts': 'Mostrar visualizações',
  'settings.appearance.showShorts': 'Mostrar Shorts',
  'settings.startup.heading': 'Inicialização e segundo plano',
  'settings.startup.autoStart': 'Iniciar o Chronicle automaticamente ao entrar no sistema',
  'settings.startup.backgroundMode':
    'Continuar rodando em segundo plano quando a janela for fechada',
  'settings.startup.backgroundModeNote':
    'Um ícone na bandeja permite reabrir o Chronicle ou encerrá-lo de vez; fechar a janela apenas a oculta. Isso também permite que a sincronização (e as notificações, se ativadas abaixo) continuem sem a janela aberta.',
  'settings.startup.popOutOnClose': 'Destacar o vídeo ao fechar a janela',
  'settings.startup.popOutOnCloseNote':
    'Se um vídeo estiver tocando, fechar a janela o destaca para a janela flutuante sempre visível (o mesmo que pressionar p) em vez de deixá-lo tocando silenciosamente atrás do ícone da bandeja — fechar essa janela flutuante é o que realmente para o vídeo. Desative isso e fechar a janela pausa o vídeo em vez de destacá-lo.',
  'settings.startup.startMinimized': 'Iniciar minimizado na bandeja (não abrir a janela)',
  'settings.startup.startMinimizedNote':
    'Abrir o Chronicle você mesmo sempre mostra a janela — isso só se aplica à inicialização automática ao entrar no sistema.',
  'settings.notifications.heading': 'Notificações',
  'settings.notifications.enabled': 'Me notificar sobre novos vídeos',
  'settings.notifications.backgroundModeHint':
    'As notificações só disparam enquanto o Chronicle está em execução. Ative "Continuar em segundo plano" acima para que continuem depois de fechar a janela.',
  'settings.notifications.scope': 'Me notificar sobre',
  'settings.notifications.scopeAll': 'Todos os canais',
  'settings.notifications.scopeSelected': 'Canais selecionados',
  'settings.notifications.scopeSelectedHint':
    'Ative ou desative notificações por canal pelo ícone ao lado dele na barra lateral, ou pela página do canal.',
  'settings.notifications.notifyShorts': 'Me notificar sobre novos Shorts',
  'settings.notifications.notifyShortsNote':
    'Desativado significa que os Shorts continuam aparecendo no seu feed, mas nunca disparam uma notificação — útil para canais que publicam muitos. Shorts ocultos do feed acima nunca notificam de qualquer forma.',
  'settings.notifications.autoFavorite': 'Notificar automaticamente para canais que eu favoritar',
  'settings.notifications.autoFavoriteNote':
    'Favoritar um canal ativa as notificações dele; desfavoritar as desativa de novo — a menos que você mude o estado de notificação desse canal manualmente depois, o que é sempre respeitado.',
  'settings.notifications.autoFavoriteDisableConfirm':
    'Também desativar as notificações dos canais que já estão favoritados?',
  'settings.notifications.autoFavoriteDisableKeep': 'Manter como está',
  'settings.notifications.autoFavoriteDisableClear': 'Desativar para os favoritos',
  'settings.data.heading': 'Dados',
  'settings.data.note':
    'Tudo o que o Chronicle sabe vive neste computador. A exportação é um único arquivo JSON documentado (veja o FORMAT.md no repositório) — você pode sair com tudo, a qualquer momento. O próprio arquivo SQLite também é um backup legítimo.',
  'settings.data.exportButton': 'Exportar dados…',
  'settings.data.deleteConfirmButton': 'Clique de novo para apagar o banco de dados e sua chave',
  'settings.data.deleteButton': 'Apagar todos os dados locais',
  'settings.data.exportedBanner': 'Exportados {videos} vídeos e {states} estados para {path}',
  'settings.data.exportFailedBanner': 'Falha na exportação: {message}',

  // Wizard — shared chrome
  'wizard.exitButton': '✕ Fechar',
  'wizard.screenshot.placeholder':
    'Captura de tela pendente — o texto à esquerda traz a orientação completa.',
  'wizard.screenshot.verifiedOn': 'verificado em {date}',
  'wizard.nav.back': '← Voltar',
  'wizard.nav.next': 'Avançar →',
  'wizard.copyRow.copy': 'Copiar',
  'wizard.copyRow.copied': 'Copiado ✓',

  // Wizard — WelcomeStep
  'wizard.welcome.heading': 'O Chronicle não tem servidor nem chave de API. Você vai criar a sua.',
  'wizard.welcome.intro.pre': 'É grátis, leva cerca de',
  'wizard.welcome.intro.strong': '10 minutos, só uma vez',
  'wizard.welcome.intro.post': ', e significa que seus dados e seu acesso pertencem só a você:',
  'wizard.welcome.bullet.quota': 'Sua própria cota de API — compartilhada com ninguém.',
  'wizard.welcome.bullet.noThirdParty':
    'Nenhum terceiro no meio — os desenvolvedores do Chronicle nunca acessam sua conta.',
  'wizard.welcome.bullet.revocable':
    'Revogável por você, a qualquer momento, no seu próprio console do Google.',
  'wizard.welcome.dim':
    'Você vai precisar de uma conta do Google. Nenhuma conta de faturamento é necessária.',
  'wizard.welcome.startButton': 'Vamos configurar',
  'wizard.welcome.quickPathButton': 'Já fiz isso antes — só importar minha chave',

  // Wizard — ConsoleStep (shared)
  'wizard.step.heading': 'Etapa {label} — {title}',
  'wizard.step.variationsSummary': 'Algo parece diferente?',

  // Wizard — ConsoleStep: project
  'wizard.step.project.title': 'Crie um projeto no Google Cloud',
  'wizard.step.project.why':
    'O Google agrupa o acesso à API em "projetos". Você precisa de um para guardar sua própria chave — é grátis, e nenhuma conta de faturamento é necessária para a cota padrão da API do YouTube.',
  'wizard.step.project.urlLabel': 'Abrir a página de criação de projeto',
  'wizard.step.project.copyLabel': 'Nome de projeto sugerido',
  'wizard.step.project.confirmLabel': 'Criei o projeto.',
  'wizard.step.project.variations':
    'Se o Google pedir uma organização, escolha "Sem organização". Se você já tem projetos, a página pode abrir um seletor primeiro — use "Novo projeto".',

  // Wizard — ConsoleStep: enable-api
  'wizard.step.enableApi.title': 'Ative a YouTube Data API v3',
  'wizard.step.enableApi.why':
    'Os projetos começam com todas as APIs desativadas; você está ativando só a que o Chronicle precisa — suas inscrições, metadados de vídeo e (somente quando você optar por se inscrever, comentar ou curtir algo) essas ações também.',
  'wizard.step.enableApi.urlLabel': 'Abrir a página da YouTube Data API',
  'wizard.step.enableApi.confirmLabel': 'Cliquei em Ativar.',
  'wizard.step.enableApi.variations':
    'Confirme que seu novo projeto está selecionado na barra azul no topo antes de clicar em Ativar. Se o botão disser "Gerenciar", a API já está ativada — você terminou aqui.',

  // Wizard — ConsoleStep: consent
  'wizard.step.consent.title': 'Configure a tela de consentimento OAuth',
  'wizard.step.consent.why':
    'Essa é a tela de permissão que você verá ao conectar. Como é o seu próprio projeto, você é ao mesmo tempo o desenvolvedor e o único usuário.',
  'wizard.step.consent.urlLabel': 'Abrir as configurações da tela de consentimento',
  'wizard.step.consent.copyLabel': 'Nome de app sugerido',
  'wizard.step.consent.confirmLabel':
    'Configurei a tela de consentimento (Externo, meu e-mail nos dois campos de contato).',
  'wizard.step.consent.variations':
    'Tipo de usuário: Externo (Interno só existe para organizações Workspace). Não é preciso adicionar logo nem escopos — o Chronicle solicita seu escopo somente leitura no momento de conectar. Pule toda seção opcional. O Google às vezes renomeia essa página para "Audiência" / "Marca" dentro de "Google Auth Platform".',

  // Wizard — ConsoleStep: test-user
  'wizard.step.testUser.title': 'Adicione você mesmo como usuário de teste',
  'wizard.step.testUser.why':
    'Enquanto o projeto está no modo "Teste", só os usuários de teste listados podem entrar — ou seja, você.',
  'wizard.step.testUser.urlLabel': 'Abrir a tela de consentimento (seção Usuários de teste)',
  'wizard.step.testUser.confirmLabel': 'Adicionei meu e-mail como usuário de teste.',
  'wizard.step.testUser.variations':
    'No layout mais novo do "Google Auth Platform" a lista fica em Audiência → Usuários de teste. Use exatamente a conta do Google com a qual você vai se conectar.',
  'wizard.step.testUser.emailLabel': 'Qual conta do Google você vai usar?',
  'wizard.step.testUser.emailPlaceholder': 'voce@gmail.com',
  'wizard.step.testUser.copyEmailLabel': 'Copiar para a lista de usuários de teste',
  'wizard.step.testUser.emailNote': 'Guardado só nesta máquina, só para este assistente.',

  // Wizard — ConsoleStep: publish
  'wizard.step.publish.title': 'Publique o app (recomendado)',
  'wizard.step.publish.why':
    'No modo Teste, o Google expira sua conexão a cada 7 dias. Clicar em "Publicar app" torna seu token permanente. Você pode ver um aviso de "app não verificado" ao conectar — isso é esperado: o "desenvolvedor não verificado" é você.',
  'wizard.step.publish.urlLabel': 'Abrir a tela de consentimento (Publicar app)',
  'wizard.step.publish.variations':
    'Publicar usando apenas o escopo somente leitura do YouTube não exige revisão de verificação do Google. Se você pular isso, o Chronicle vai detectar a expiração semanal e oferecer uma reconexão em dois cliques — além de um link de volta para esta etapa.',
  'wizard.step.publish.publishedButton': 'Eu publiquei',
  'wizard.step.publish.skipButton': 'Pular — aceito reconectar toda semana',

  // Wizard — ConsoleStep: client
  'wizard.step.client.title': 'Crie um cliente OAuth do tipo Desktop',
  'wizard.step.client.why':
    'Isso cria o arquivo de chave que o Chronicle vai usar de fato — ele identifica sua instalação do Chronicle para o seu projeto.',
  'wizard.step.client.urlLabel': 'Abrir a página de credenciais',
  'wizard.step.client.copyLabel': 'Nome de cliente sugerido',
  'wizard.step.client.confirmLabel': 'Criei o cliente Desktop e baixei o arquivo JSON.',
  'wizard.step.client.variations':
    'Criar credenciais → ID do cliente OAuth → o Tipo de aplicativo precisa ser "Aplicativo para computador" (não "Aplicativo da Web"). O download geralmente se chama client_secret_….json e vai para a sua pasta de Downloads.',

  // Wizard — ImportStep / FileDrop
  'wizard.import.heading': 'Etapa 6 — Importe seu arquivo de chave',
  'wizard.import.why.part1': 'Selecione o',
  'wizard.import.why.part2':
    'que você baixou. O Chronicle extrai a chave para o chaveiro do sistema — ela nunca sai desta máquina nem toca em um servidor.',
  'wizard.import.drop.part1': 'Solte o',
  'wizard.import.drop.part2': 'aqui, ou clique para selecioná-lo',
  'wizard.import.backToClientStep': '← Voltar à Etapa 5 (criar um cliente Desktop)',
  'wizard.import.okMessage':
    '✓ Chave importada — o Chronicle a guarda no chaveiro do sistema, nunca on-line.',
  'wizard.import.okNote':
    'Você pode apagar o arquivo baixado agora, se quiser; o Chronicle nunca mexe nos seus arquivos.',
  'wizard.import.storageWarning':
    'Nenhum chaveiro do sistema foi detectado, então a chave é guardada com criptografia local reversível — qualquer pessoa com acesso à sua conta de usuário poderia lê-la.',

  // Wizard — ConnectStep
  'wizard.connect.heading': 'Etapa 7 — Conecte-se ao Google',
  'wizard.connect.why':
    'Seu navegador vai abrir a tela de consentimento do Google. O Chronicle escuta localmente (127.0.0.1) pela resposta — os tokens nunca saem desta máquina.',
  'wizard.connect.warningTitle': 'Atenção: o aviso de "app não verificado".',
  'wizard.connect.warning.part1': 'O Google pode mostrar',
  'wizard.connect.warning.quote': '"O Google não verificou este app"',
  'wizard.connect.warning.part2': '. Isso é esperado — o desenvolvedor não verificado é',
  'wizard.connect.warning.you': 'você',
  'wizard.connect.warning.part3': '. Clique em',
  'wizard.connect.warning.advanced': 'Avançado',
  'wizard.connect.warning.goUnsafe': 'Acessar Chronicle (não seguro)',
  'wizard.connect.warning.part4':
    '. Aqui é seguro porque você está confiando no seu próprio projeto.',
  'wizard.connect.button': 'Conectar com o Google',
  'wizard.connect.buttonWaiting': 'Aguardando o navegador…',
  'wizard.connect.apiNotEnabledError': 'A YouTube Data API não está ativada no seu projeto.',
  'wizard.connect.testUserHint':
    'Se o Google bloqueou o login, a causa mais comum é a falta de um usuário de teste (Etapa 4) enquanto o projeto está no modo Teste.',
  'wizard.connect.fixItButton': '← Corrigir na Etapa {step}',
  'wizard.connect.connectedPlain': '✓ Conectado.',
  'wizard.connect.connectedAs': '✓ Conectado como {name}.',
  'wizard.connect.closingNote':
    'Tudo o que o Chronicle sabe fica guardado neste computador. Sua chave pode ser revogada a qualquer momento em myaccount.google.com/permissions.',
  'wizard.connect.openChronicleButton': 'Abrir o Chronicle →',

  // App — feed buckets
  'app.bucket.today': 'Hoje',
  'app.bucket.yesterday': 'Ontem',
  'app.bucket.thisWeek': 'Esta semana',
  'app.bucket.earlier': 'Anteriores',
  'app.bucket.favoriteChannels': 'Dos seus canais favoritos',

  // App — banners
  'app.banner.connectionFailed': 'Falha na conexão: {message}',
  'app.banner.reconnectRequired':
    'Reconecte-se ao Google — sua autorização expirou. (Projetos em modo de teste expiram semanalmente; publicar o app corrige isso permanentemente.)',
  'app.banner.reconnectAction': 'Reconectar',
  'app.banner.offline':
    'Parece que você está offline — mostrando dados locais. A atualização vai tentar de novo.',
  'app.banner.refreshFailed': 'Falha na atualização: {message}',
  'app.banner.openVideoFailed': 'Não foi possível abrir o vídeo: {message}',
  'app.banner.refreshAllFailed':
    'A atualização não conseguiu alcançar nenhum canal ({count} falharam) — verifique sua conexão. Vai tentar de novo no próximo ciclo.',
  'app.banner.showDetails': 'Detalhes',
  'app.banner.hideDetails': 'Ocultar detalhes',
  'app.banner.showDetailsTitle': 'Mostrar quais canais falharam e por quê',
  'app.banner.failureAccountLevel': 'Nível de conta',
  'app.banner.quotaExceeded':
    'Limite diário da API atingido — ele reinicia às {time} no seu horário. O Chronicle continua funcionando com os dados locais; a descoberta via RSS continua gratuita.',
  'app.banner.signedOut': 'Você saiu. Os dados locais foram mantidos — reconecte quando quiser.',
  'app.banner.updateAvailable': 'O Chronicle {version} está disponível.',
  'app.banner.updateAction': 'Ver lançamento',
  'app.banner.dismissTitle': 'Dispensar',
  'app.banner.newVideos': '{count} vídeo{plural} novo{plural}',
  'app.banner.unsubscribeFailed': 'Não foi possível cancelar a inscrição: {message}',
  'app.banner.searchFailed': 'Falha na busca: {message}',
  'app.banner.subscribeFailed': 'Não foi possível se inscrever: {message}',
  'app.banner.accountConnectFailed': 'Não foi possível conectar a conta: {message}',
  'app.banner.accountSyncFailed': 'Não foi possível sincronizar esta conta: {message}',
  'app.banner.removeAccountFailed': 'Não foi possível remover esta conta: {message}',
  'app.writeScopeDialog.body':
    'O Chronicle precisa de uma permissão extra, única, do Google para esta ação (curtir, se inscrever ou comentar). Continuar abre seu navegador para concedê-la.',
  'app.writeScopeDialog.cancel': 'Agora não',
  'app.writeScopeDialog.continue': 'Continuar para o Google',

  // App — sidebar
  'app.sidebar.showTitle': 'Mostrar barra lateral',

  // App — topbar
  'app.topbar.refreshTitle': 'Atualizar (r)',
  'app.topbar.channelFallback': 'Canal',
  'app.topbar.markAllRead': 'Marcar tudo como lido (M)',
  'app.topbar.searchYouTubePlaceholder': 'Buscar',
  'app.topbar.clearFilterTitle': 'Limpar',
  'app.topbar.itemSizeTitle': 'Tamanho do item: {size}',
  'app.topbar.switchToListView': 'Mudar para visualização em lista (v)',
  'app.topbar.switchToGridView': 'Mudar para visualização em grade (v)',
  'app.topbar.unsubscribe': 'Cancelar inscrição',
  'app.topbar.confirmUnsubscribe': 'Clique de novo para cancelar a inscrição',
  'app.topbar.openChannelTitle': 'Abrir a página deste canal no YouTube',
  'app.topbar.favoriteChannelTitle': 'Favoritar — priorizar no topo do feed principal',
  'app.topbar.unfavoriteChannelTitle': 'Desfavoritar',

  // App — status text
  'app.status.filteringShorts': 'identificando Shorts — {checked} de {total} verificados…',
  'app.status.checkingChannels': 'verificando {checked} de {total} canais…',
  'app.status.refreshing': 'atualizando…',
  'app.status.caughtUp': 'Tudo em dia',
  'app.status.lastRefreshSuffix': ' · última atualização às {time}',
  'app.status.unreadCount': '{count} não lidos',
  'app.status.checkingChannelsInfo':
    'Verificando os uploads de cada canal inscrito em busca de vídeos publicados desde a última sincronização.',
  'app.status.filteringShortsInfo':
    'Confirmando quais dos vídeos recém-encontrados são Shorts do YouTube.',
  'app.status.refreshingInfo':
    'Relistando suas inscrições e depois verificando cada canal em busca de novos vídeos.',

  // App — feed
  'app.feed.emptyFiltered': 'Nada corresponde ao filtro.',
  'app.feed.emptyNoVideos': 'Nada por aqui ainda.',

  // FeedList — shared between list rows and grid cards
  'feed.card.undoLabel': 'Ignorado — vai sair desta view',
  'feed.card.undoButton': 'Desfazer (u)',
  'feed.card.favoriteTitle': 'Favorito',
  'feed.card.watchLaterTitle': 'Assistir mais tarde',
  'feed.card.toggleReadTitle': 'Alternar lido (m)',
  'feed.card.ignoreTitle': 'Ignorar (i)',
  'feed.card.toggleFavoriteTitle': 'Alternar favorito (f)',
  'feed.card.toggleWatchLaterTitle': 'Alternar assistir mais tarde (w)',
  'feed.card.openInBrowserTitle': 'Abrir no navegador (b)',
  'feed.card.shortBadge': 'Short',
  'feed.card.liveBadge': 'Ao vivo',
  'feed.card.premiereBadge': 'Estreia',
  'feed.card.upcomingBadge': 'Em breve',
  'feed.loadingMore': 'Carregando mais…',

  // PlayerView
  'player.topbar.back': '← Voltar',
  'player.topbar.backToFeed': '← Voltar ao feed',
  'player.miniplayer.maximizeTitle': 'Voltar ao player completo (e)',
  'player.miniplayer.closeTitle': 'Fechar (x)',
  'player.extractTitle': 'Destacar em janela própria sempre visível (p)',
  'player.miniplayer.resizeTitle': 'Arraste para redimensionar',
  'player.overlay.back': 'Voltar (Esc)',
  'player.overlay.embedBlockedTitle': 'Este canal desativou a reprodução incorporada.',
  'player.overlay.openInBrowser': 'Abrir no navegador',
  'player.action.markRead': 'Marcar como lido (m)',
  'player.action.markUnread': 'Marcar como não lido (m)',
  'player.action.favorite': '☆ Favoritar (f)',
  'player.action.favorited': '★ Favoritado (f)',
  'player.action.watchLater': 'Assistir mais tarde (w)',
  'player.action.inWatchLater': 'Em Assistir mais tarde (w)',
  'player.action.subscribe': 'Inscrever-se (s)',
  'player.action.subscribed': 'Inscrito (s)',
  'player.action.ignore': 'Ignorar (i)',
  'player.action.openInBrowser': 'Abrir no navegador (b)',
  'player.action.like': 'Curtir (l)',
  'player.action.liked': 'Curtido (l)',
  'player.description.showMore': 'Mostrar mais',
  'player.description.showLess': 'Mostrar menos',
  'player.description.shortsLinkTitle':
    'Shorts abrem no navegador (o Chronicle nunca reproduz Shorts)',
  'player.upNext.label': 'A seguir em Assistir mais tarde',
  'player.upNext.dismiss': 'Dispensar',
  'player.chat.toggle': 'Ver chat ao vivo',
  'player.chat.extractTitle': 'Destacar o chat em janela própria',
  'player.chat.signInInfo':
    'O chat é carregado direto do YouTube, então a sessão ativa no Chronicle não vale por lá — é preciso entrar aqui também, só essa vez.',
  'player.chat.signInHint': 'Quer comentar? Entre no YouTube aqui também:',
  'player.chat.signInLink': 'Entrar no YouTube',
  'player.chat.signInWindowTitle': 'Entrar para o Chat ao Vivo',

  // Sidebar
  'sidebar.collapseTitle': 'Recolher barra lateral',
  'sidebar.view.all': 'Todos',
  'sidebar.view.unread': 'Não lidos',
  'sidebar.view.watchLater': 'Assistir mais tarde',
  'sidebar.view.favorites': 'Favoritos',
  'sidebar.view.ignored': 'Ignorados',
  'sidebar.channelsHeader': 'Canais',
  'sidebar.findChannelPlaceholder': 'Buscar canal  c',
  'sidebar.clearTitle': 'Limpar',
  'sidebar.noChannelMatch': 'Nenhum canal encontrado.',
  'sidebar.noChannels': 'Esta conta ainda não segue nenhum canal.',
  'sidebar.settingsLabel': 'Configurações',

  // Sidebar — Accounts (B-003)
  'sidebar.accountsHeader': 'Contas',
  'sidebar.accountDisconnected': 'Reconexão necessária',
  'sidebar.addAccount': '+ Adicionar conta',
  'sidebar.accountMenu.title': 'Mais',
  'sidebar.accountMenu.syncNow': 'Sincronizar agora',
  'sidebar.accountMenu.remove': 'Remover conta',
  'sidebar.accountMenu.confirmRemove': 'Clique de novo para remover',
  'sidebar.accountMenu.removeDisabledTitle':
    'A conta principal não pode ser removida aqui — use Sair em Configurações',
  'sidebar.channelMenu.title': 'Mais',
  'sidebar.channelMenu.unsubscribe': 'Cancelar inscrição',
  'sidebar.channelMenu.confirmUnsubscribe': 'Clique de novo para confirmar',
  'sidebar.channelMenu.favorite': 'Favoritar — priorizar no topo do feed principal',
  'sidebar.channelMenu.unfavorite': 'Desfavoritar',
  'sidebar.channelMenu.notify': 'Me notificar sobre novos vídeos deste canal',
  'sidebar.channelMenu.unnotify': 'Parar de me notificar sobre este canal',

  // YouTube search (B-009)
  'search.empty': 'Nenhum resultado.',
  'search.searching': 'Buscando em todo o YouTube…',
  'search.subscribeButton': 'Inscrever-se',
  'search.subscribedButton': 'Inscrito',
  'search.videoChannelPrefix': 'em',
  'search.loadingMore': 'Carregando mais resultados…',

  // Comments (B-006)
  'comments.show': 'Mostrar comentários (c)',
  'comments.hide': 'Ocultar comentários (c)',
  'comments.loading': 'Carregando comentários…',
  'comments.loadingMore': 'Carregando mais comentários…',
  'comments.empty': 'Nenhum comentário ainda.',
  'comments.reconnectRequired':
    'Sua conexão precisa ser renovada — reconecte em Configurações para ver os comentários.',
  'comments.addPlaceholder': 'Adicione um comentário…',
  'comments.replyPlaceholder': 'Escreva uma resposta…',
  'comments.postButton': 'Publicar',
  'comments.posting': 'Publicando…',
  'comments.replyButton': 'Responder',

  // Add another account (B-003)
  'addAccount.title': 'Adicionar outra conta do Google',
  'addAccount.instructions':
    'Adicione o e-mail da nova conta como usuário de teste no seu projeto existente do Google Cloud (o mesmo da sua primeira configuração) e depois conecte-a abaixo.',
  'addAccount.openTestUsersLink': 'Abrir configurações de usuários de teste',
  'addAccount.connectButton': 'Conectar conta do Google',
  'addAccount.connecting': 'Aguardando o navegador…',
  'addAccount.cancelButton': 'Cancelar'
}

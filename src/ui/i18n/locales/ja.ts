import type { Dict, LocaleMeta } from '../types'

// D-072: AI-generated translation, not yet reviewed by a native speaker — it
// may contain mistakes or awkward phrasing. If you speak Japanese, a
// correction or a full review is a welcome contribution: this is a plain
// Partial<Dict>, so missing/wrong keys don't break anything — t() falls
// back to English for any key missing here. `{name}`-style placeholders
// must stay exactly as in en.ts; only the surrounding text should change.
export const meta: LocaleMeta = { code: 'ja', nativeName: '日本語', reviewed: false }

export const dict: Partial<Dict> = {
  // format.ts
  'format.minutesAgo': '{minutes} 分前',
  'format.hoursAgo': '{hours} 時間前',
  'format.daysAgo': '{days} 日前',
  'format.startedMinutesAgo': '{minutes} 分前に開始',
  'format.startedHoursAgo': '{hours} 時間前に開始',
  'format.startedDaysAgo': '{days} 日前に開始',
  'format.startedOn': '{date} に開始',
  'format.views': '{count} 回視聴',
  'format.subscribers': 'チャンネル登録者数 {count} 人',

  // HelpOverlay
  'help.title': 'キーボードショートカット',
  'help.section.feed': 'フィード',
  'help.section.player': 'プレーヤー（現在開いている動画）',
  'help.section.miniplayer': 'ミニプレーヤー（ドッキング中）',
  'help.action.nextPrev': '次 / 前の動画',
  'help.action.play': '再生（プレーヤー画面を開く）',
  'help.action.openByUrl': 'URL で動画を開く',
  'help.action.openInBrowser': 'ブラウザで開く',
  'help.action.toggleReadUnread': '既読 / 未読を切り替え',
  'help.action.ignore': '無視する（u で元に戻す）',
  'help.action.ignorePlayer': '無視する（プレーヤーを閉じる/ドッキングする）',
  'help.action.undoIgnore': '直前の無視を元に戻す',
  'help.action.toggleFavorite': 'お気に入りを切り替え',
  'help.action.toggleWatchLater': '後で見るを切り替え',
  'help.action.addToPlaylist': '再生リストに追加',
  'help.action.markAllRead': 'すべて既読にする（現在のビュー）',
  'help.action.toggleLayout': 'グリッド / リスト表示を切り替え',
  'help.action.topEnd': '読み込み済みフィードの先頭 / 末尾へ',
  'help.action.switchView': 'ビューを切り替え（すべて、未読、後で見る、再生リスト、お気に入り、無視）',
  'help.action.reload': 'ローカルデータから再読み込み',
  'help.action.filter': 'ビュー内でフィルター',
  'help.action.findChannel': 'チャンネルを検索（サイドバー）',
  'help.action.toggleSidebar': 'サイドバーの表示/非表示',
  'help.action.playPause': '再生 / 一時停止',
  'help.action.seek': '±5 秒シーク',
  'help.action.toggleLike': '高評価を切り替え',
  'help.action.toggleSubscribe': 'チャンネル登録 / 登録解除',
  'help.action.toggleComments': 'コメントの表示 / 非表示',
  'help.action.nextInQueue': 'キューの次へ（キューがある場合）',
  'help.action.extractWindow': '常に最前面の独立したウィンドウに切り離す',
  'help.action.maximizeMiniplayer': '通常のプレーヤーに戻す',
  'help.action.closeMiniplayer': '閉じる',
  'help.action.thisOverlay': 'このヘルプ画面',
  'help.action.backClose': '戻る / 閉じる',

  // Titlebar
  'titlebar.minimize': '最小化',
  'titlebar.maximizeRestore': '最大化 / 元に戻す',
  'titlebar.close': '閉じる',

  // UrlPrompt
  'urlPrompt.title': 'YouTube の動画を開く',
  'urlPrompt.placeholder': 'https://www.youtube.com/watch?v=…',
  'urlPrompt.notice.shorts':
    'これは Shorts のリンクです。Chronicle は Shorts を再生しません。ブラウザで開いています…',
  'urlPrompt.notice.channelOrPlaylist': 'チャンネルと再生リストは、今のところブラウザで開きます。',
  'urlPrompt.notice.invalid': 'これは YouTube の動画 URL ではないようです。',

  // ConnectPanel
  'connect.readError': 'ファイルを読み込めませんでした。',
  'connect.title': 'Chronicle を YouTube アカウントに接続',
  'connect.intro.part1':
    'Chronicle には認証情報が同梱されていません。自分自身の Google Cloud プロジェクトを用意するため、データと API クォータはあなただけのものになります。初回設定は一度だけで約10分かかります。詳しくは',
  'connect.intro.part2':
    'リポジトリ内のガイドで、プロジェクトの作成方法と',
  'connect.intro.part3': 'のダウンロード方法を順を追って説明しています。',
  'connect.step1.title': 'OAuth クライアントをインポート',
  'connect.step1.detailDone': 'client_secret.json をインポートしました。',
  'connect.step1.detailPending':
    'Google Cloud コンソールからダウンロードした client_secret.json を選択してください（デスクトップアプリ タイプ）。',
  'connect.step1.buttonDone': 'ファイルを置き換える…',
  'connect.step1.button': 'client_secret.json を選択…',
  'connect.step2.title': 'ブラウザで認可する',
  'connect.step2.detail':
    '既定のブラウザで Google の同意画面が開きます。Chronicle はローカル（127.0.0.1）で応答を待ち受けます。トークンがこのマシンの外に出ることはありません。',
  'connect.step2.buttonConnecting': 'ブラウザを待っています…',
  'connect.step2.button': 'Google に接続',
  'connect.storageWarning':
    '注意: OS のキーチェーンが検出されなかったため、トークンは可逆なローカル暗号化で保存されます。ユーザーアカウントにアクセスできる人なら誰でも読み取れる可能性があります。',

  // SettingsView
  'settings.language.heading': '言語',
  'settings.language.label': '言語',
  'settings.language.system': 'システムに従う',
  'settings.language.unreviewedNote': 'この翻訳は AI によって生成されたもので、まだネイティブスピーカーによる確認が行われていません。',
  'settings.language.unreviewedNoteDetail':
    '誤りや不自然な表現が含まれている可能性があります。この言語を話せる方は、修正や全体のレビューをご協力いただけるととても助かります。',
  'settings.connection.heading': '接続',
  'settings.connection.stateConnected': 'Google アカウントに接続済みです。',
  'settings.connection.stateDisconnected': 'API キーはインポート済みですが、接続されていません。',
  'settings.connection.stateUnconfigured': 'まだ API キーがインポートされていません。',
  'settings.connection.scopeGrantedPrefix': '付与されたスコープ:',
  'settings.connection.scopeName.readonly': 'YouTube 読み取り専用',
  'settings.connection.scopeName.readonlyPlusWrite': 'YouTube 読み取り専用 + 登録/コメント/高評価',
  'settings.connection.scopeGrantedSuffix.readonly':
    'チャンネル登録の一覧取得や動画メタデータの取得に使われます。登録、コメント、高評価もアプリ内から利用でき、初めて使用する際に Chronicle がこの追加の権限を求めます。',
  'settings.connection.scopeGrantedSuffix.readonlyPlusWrite':
    'チャンネル登録の一覧取得、動画メタデータの取得、そしてあなた自身が行う操作（登録/登録解除、コメント、高評価）についてのみ代理で実行するために使われます。Chronicle 独自の既読/視聴/お気に入り状態はいずれにせよローカルのままで、YouTube に書き込まれることはありません。',
  'settings.connection.revokeLink': 'いつでも取り消せます ↗',
  'settings.connection.keychainOk': 'キーとトークンはシステムのキーチェーンに保存されています。',
  'settings.connection.keychainFallback':
    'OS のキーチェーンが検出されませんでした。トークンは可逆なローカル暗号化で保存されます。ユーザーアカウントにアクセスできる人なら誰でも読み取れます。',
  'settings.connection.playerSessionNote':
    '埋め込みプレーヤーとライブチャットは、それぞれ独自の別のブラウザセッションを使用します。',
  'settings.connection.playerSessionNoteDetail':
    '再生時に YouTube の「ロボットでないことを確認してください」という表示が出た場合や、ライブチャットに書き込みたい場合は、ここでサインインしてください。これは一度だけの手順です。Premium にサインインしている場合、広告なし再生が適用されるのもここです。',
  'settings.connection.signInToYouTubeButton': 'YouTube にサインイン',
  'settings.connection.reconnectButton': '「{account}」を再接続',
  'settings.connection.replaceKeyButton': 'API キーを置き換える',
  'settings.connection.fixWeeklyLogoutButton': '毎週のログアウトを修正',
  'settings.connection.signOutButton': 'サインアウト',
  'settings.sync.heading': '同期',
  'settings.sync.backgroundRefresh': 'バックグラウンド更新',
  'settings.sync.every15': '15 分ごと',
  'settings.sync.every30': '30 分ごと',
  'settings.sync.everyHour': '1 時間ごと',
  'settings.sync.manualOnly': '手動のみ',
  'settings.sync.note': '更新のたびにチャンネル登録も再確認します。',
  'settings.sync.noteDetail':
    '新しいチャンネル登録は次回の同期時に自動的に表示されます。ここで何かをする必要はありません。',
  'settings.sync.checkForUpdates': 'アップデートを確認',
  'settings.sync.checkForUpdatesNote':
    'Chronicle {version}。GitHub に新しいリリースがないか、最大でも1日1回確認します。',
  'settings.sync.checkForUpdatesNoteDetail':
    '何かを自動的にダウンロードまたはインストールすることは一切ありません。リリースページから自分で判断してください。',
  'settings.playback.heading': '再生',
  'settings.playback.defaultSpeed': 'デフォルトの速度',
  'settings.playback.speedNormal': '標準',
  'settings.playback.note': 'プレーヤーはこの速度にあらかじめ設定された状態で開きます。',
  'settings.playback.noteDetail':
    '埋め込みプレーヤー自体のコントロールから動画ごとに変更することもできます。それによってこのデフォルト値が変わることはありません。',
  'settings.playback.watchLaterAutoRemove': '開いたときに「後で見る」から削除',
  'settings.playback.watchLaterAutoRemoveNote': '動画を開いた瞬間にキューから削除します。',
  'settings.playback.watchLaterAutoRemoveNoteDetail':
    '自分でオフにするのと同じです。デフォルトではオフになっているため、あなたが指示したときだけキューが縮小します。',
  'settings.playback.showDislikeEstimate': '低評価数の推定値を表示',
  'settings.playback.showDislikeEstimateNote':
    'YouTube は2021年に公開の低評価数を廃止しましたが、高評価数はいずれにせよ実数のままです。',
  'settings.playback.showDislikeEstimateNoteDetail':
    'デフォルトではオフです。これをオンにすると、推定値を取得するために各動画の id が returnyoutubedislike.com（YouTube ではない無料のサードパーティサービス）に送信されます。それ以外のあなたに関する情報は送信されません。',
  'settings.playback.showDislikeEstimateAttribution': '低評価数の推定値の提供元:',
  'settings.appearance.heading': '外観',
  'settings.appearance.theme': 'テーマ',
  'settings.appearance.themeSystem': 'システムに従う',
  'settings.appearance.themeDark': 'ダーク',
  'settings.appearance.themeLight': 'ライト',
  'settings.appearance.showViewCounts': '視聴回数を表示',
  'settings.appearance.showShorts': 'Shorts を表示',
  'settings.startup.heading': '起動とバックグラウンド',
  'settings.startup.autoStart': 'ログイン時に Chronicle を自動的に起動',
  'settings.startup.backgroundMode': 'ウィンドウを閉じてもバックグラウンドで実行を続ける',
  'settings.startup.backgroundModeNote': 'トレイアイコンから Chronicle を再度開いたり、完全に終了したりできます。',
  'settings.startup.backgroundModeNoteDetail':
    'ウィンドウを閉じるのは非表示にするだけでアプリを終了しないため、同期（および下で有効にした場合は通知）はバックグラウンドで続きます。',
  'settings.startup.popOutOnClose': 'ウィンドウを閉じるときに動画を切り離す',
  'settings.startup.popOutOnCloseNote':
    'ウィンドウを閉じると、再生中の動画が代わりにフローティングプレーヤーに切り離されます。',
  'settings.startup.popOutOnCloseNoteDetail':
    'p キーを押すのと同じです。そのフローティングプレーヤーを閉じることで、実際に再生が停止します。これをオフにすると、ウィンドウを閉じたときに動画が切り離される代わりに一時停止します。',
  'settings.startup.startMinimized': 'トレイに最小化した状態で起動する（ウィンドウを開かない）',
  'settings.startup.startMinimizedNote': 'ログイン時の自動起動にのみ適用されます。',
  'settings.startup.startMinimizedNoteDetail':
    '自分で Chronicle を開いた場合は、この設定に関わらず常にウィンドウが表示されます。',
  'settings.notifications.heading': '通知',
  'settings.notifications.enabled': '新しい動画を通知する',
  'settings.notifications.backgroundModeHint': '通知は Chronicle が実行中の間だけ発生します。',
  'settings.notifications.backgroundModeHintDetail':
    'ウィンドウを閉じた後も通知を続けるには、上の「バックグラウンドで実行」をオンにしてください。',
  'settings.notifications.scope': '通知の対象',
  'settings.notifications.scopeAll': 'すべてのチャンネル',
  'settings.notifications.scopeSelected': '選択したチャンネル',
  'settings.notifications.scopeSelectedHint':
    'サイドバーの各チャンネル横のアイコン、またはチャンネルページから、チャンネルごとに通知を切り替えられます。',
  'settings.notifications.notifyShorts': '新しい Shorts を通知する',
  'settings.notifications.notifyShortsNote':
    'オフにすると、Shorts はフィードに表示され続けますが通知はされません。',
  'settings.notifications.notifyShortsNoteDetail':
    'Shorts を頻繁に投稿するチャンネルに便利です。上のフィードで非表示の Shorts は、いずれにせよ通知されません。',
  'settings.notifications.autoFavorite': 'お気に入りに追加したチャンネルを自動的に通知する',
  'settings.notifications.autoFavoriteNote':
    'チャンネルをお気に入りに追加すると通知がオンになり、お気に入りから外すと再びオフになります。',
  'settings.notifications.autoFavoriteNoteDetail':
    'ただし、そのチャンネルの通知状態を後で自分で変更した場合は常にそちらが優先されます。',
  'settings.notifications.autoFavoriteDisableConfirm':
    '現在お気に入りのチャンネルについても通知をオフにしますか？',
  'settings.notifications.autoFavoriteDisableKeep': 'そのままにする',
  'settings.notifications.autoFavoriteDisableClear': 'お気に入りについてオフにする',
  'settings.data.heading': 'データ',
  'settings.data.note': 'Chronicle が知っているすべての情報は、このコンピューター上にあります。',
  'settings.data.noteDetail':
    'エクスポートはドキュメント化された単一の JSON ファイルです（リポジトリ内の FORMAT.md）。いつでもすべてを持ち出せます。SQLite ファイル自体も正当なバックアップになります。',
  'settings.data.exportButton': 'データをエクスポート…',
  'settings.data.deleteConfirmButton': 'もう一度クリックしてデータベースとキーを消去',
  'settings.data.deleteButton': 'すべてのローカルデータを削除',
  'settings.data.exportedBanner': '{videos} 件の動画と {states} 件の状態を {path} にエクスポートしました',
  'settings.data.exportFailedBanner': 'エクスポートに失敗しました: {message}',
  'settings.data.storageLine': '{db} データベース ・ {cache} サムネイルキャッシュ ・ {videos} 件の動画',

  // Wizard — shared chrome
  'wizard.exitButton': '✕ 閉じる',
  'wizard.screenshot.placeholder':
    'スクリーンショットは準備中です。左側のテキストが完全なガイドです。',
  'wizard.screenshot.verifiedOn': '{date} に確認済み',
  'wizard.nav.back': '← 戻る',
  'wizard.nav.next': '次へ →',
  'wizard.copyRow.copy': 'コピー',
  'wizard.copyRow.copied': 'コピーしました ✓',

  // Wizard — WelcomeStep
  'wizard.welcome.heading':
    'Chronicle にはサーバーも API キーもありません。自分自身のものを作成します。',
  'wizard.welcome.intro.pre': '無料で、かかる時間は約',
  'wizard.welcome.intro.strong': '10分、一度だけ',
  'wizard.welcome.intro.post': '。これにより、あなたのデータとアクセスはあなただけのものになります。',
  'wizard.welcome.bullet.quota': '誰とも共有しない、あなた自身の API クォータ。',
  'wizard.welcome.bullet.noThirdParty':
    '第三者は一切関与しません。Chronicle の開発者があなたのアカウントに触れることはありません。',
  'wizard.welcome.bullet.revocable': 'あなた自身の Google コンソールから、いつでも取り消し可能。',
  'wizard.welcome.dim': 'Google アカウントが必要です。請求先アカウントは不要です。',
  'wizard.welcome.startButton': '設定を始める',
  'wizard.welcome.quickPathButton': '以前にやったことがある: キーをインポートするだけ',

  // Wizard — ConsoleStep (shared)
  'wizard.step.heading': 'ステップ {label}: {title}',
  'wizard.step.variationsSummary': '何か違って見えますか？',

  // Wizard — ConsoleStep: project
  'wizard.step.project.title': 'Google Cloud プロジェクトを作成する',
  'wizard.step.project.why':
    'Google は API アクセスを「プロジェクト」にまとめています。自分のキーを持つにはプロジェクトが1つ必要です。無料で、YouTube API のデフォルトのクォータには請求先アカウントは不要です。',
  'wizard.step.project.urlLabel': 'プロジェクト作成ページを開く',
  'wizard.step.project.copyLabel': '推奨されるプロジェクト名',
  'wizard.step.project.confirmLabel': 'プロジェクトを作成しました。',
  'wizard.step.project.variations':
    'Google が組織を尋ねてきた場合は「組織なし」を選んでください。すでにプロジェクトがある場合、ページが先に選択画面を表示することがあります。「新しいプロジェクト」を使用してください。',

  // Wizard — ConsoleStep: enable-api
  'wizard.step.enableApi.title': 'YouTube Data API v3 を有効にする',
  'wizard.step.enableApi.why':
    'プロジェクトはすべての API が無効な状態で始まります。あなたは Chronicle が必要とするものだけを有効にします: チャンネル登録、動画のメタデータ、そして（登録・コメント・高評価を選んだ場合のみ）それらの操作です。',
  'wizard.step.enableApi.urlLabel': 'YouTube Data API のページを開く',
  'wizard.step.enableApi.confirmLabel': '「有効にする」をクリックしました。',
  'wizard.step.enableApi.variations':
    '「有効にする」をクリックする前に、上の青いバーで新しいプロジェクトが選択されていることを確認してください。ボタンに「管理」と表示されている場合は、API はすでに有効になっています。ここでの作業は完了です。',

  // Wizard — ConsoleStep: consent
  'wizard.step.consent.title': 'OAuth 同意画面を設定する',
  'wizard.step.consent.why':
    'これは接続時に表示される権限画面です。自分のプロジェクトなので、あなたは開発者であり唯一のユーザーでもあります。',
  'wizard.step.consent.urlLabel': '同意画面の設定を開く',
  'wizard.step.consent.copyLabel': '推奨されるアプリ名',
  'wizard.step.consent.confirmLabel':
    '同意画面を設定しました（外部、両方の連絡先フィールドに自分のメールアドレス）。',
  'wizard.step.consent.variations':
    'ユーザータイプ: 外部（内部は Workspace 組織にのみ存在します）。ロゴやスコープを追加する必要はありません。Chronicle は接続時に読み取り専用スコープをリクエストします。任意のセクションはすべてスキップしてください。Google はこのページを「Google Auth Platform」内の「対象」/「ブランディング」と呼ぶことがあります。',

  // Wizard — ConsoleStep: test-user
  'wizard.step.testUser.title': '自分自身をテストユーザーとして追加する',
  'wizard.step.testUser.why':
    'プロジェクトが「テスト」モードの間は、登録されたテストユーザーだけがサインインできます。それがあなたです。',
  'wizard.step.testUser.urlLabel': '同意画面を開く（テストユーザーのセクション）',
  'wizard.step.testUser.confirmLabel': '自分のメールアドレスをテストユーザーとして追加しました。',
  'wizard.step.testUser.variations':
    '新しい「Google Auth Platform」のレイアウトでは、リストは「対象」→「テストユーザー」にあります。接続に使用する Google アカウントを正確に使用してください。',
  'wizard.step.testUser.emailLabel': 'どの Google アカウントを使用しますか？',
  'wizard.step.testUser.emailPlaceholder': 'you@gmail.com',
  'wizard.step.testUser.copyEmailLabel': 'テストユーザーリスト用にコピー',
  'wizard.step.testUser.emailNote': 'このマシンにのみ、このウィザードのためだけに保存されます。',

  // Wizard — ConsoleStep: publish
  'wizard.step.publish.title': 'アプリを公開する（推奨）',
  'wizard.step.publish.why':
    'テストモードでは、Google は7日ごとに接続を期限切れにします。「アプリを公開」をクリックすると、トークンが永続的になります。接続時に「未確認のアプリ」という警告が表示されることがありますが、それは想定どおりです。「未確認の開発者」とはあなたのことです。',
  'wizard.step.publish.urlLabel': '同意画面を開く（アプリを公開）',
  'wizard.step.publish.variations':
    'YouTube の読み取り専用スコープのみで公開する場合、Google の確認審査は不要です。これをスキップした場合、Chronicle は毎週の期限切れを検出し、ワンクリックでの再接続とこのステップへのリンクを提供します。',
  'wizard.step.publish.publishedButton': '公開しました',
  'wizard.step.publish.skipButton': 'スキップ: 毎週の再接続を受け入れます',

  // Wizard — ConsoleStep: client
  'wizard.step.client.title': 'デスクトップ OAuth クライアントを作成する',
  'wizard.step.client.why':
    'これにより、Chronicle が使用する実際のキーファイルが作成されます。あなたの Chronicle のインストールを、あなたのプロジェクトに対して識別します。',
  'wizard.step.client.urlLabel': '認証情報ページを開く',
  'wizard.step.client.copyLabel': '推奨されるクライアント名',
  'wizard.step.client.confirmLabel': 'デスクトップクライアントを作成し、JSON ファイルをダウンロードしました。',
  'wizard.step.client.variations':
    '認証情報を作成 → OAuth クライアント ID → アプリケーションの種類は「デスクトップアプリ」である必要があります（「ウェブアプリケーション」ではありません）。ダウンロードされるファイルは通常 client_secret_….json という名前で、ダウンロードフォルダに保存されます。',

  // Wizard — ImportStep / FileDrop
  'wizard.import.heading': 'ステップ 6: キーファイルをインポートする',
  'wizard.import.why.part1': '選択してください:',
  'wizard.import.why.part2':
    'ダウンロードしたファイルです。Chronicle はキーをシステムのキーチェーンに抽出します。このマシンの外に出ることも、サーバーに触れることもありません。',
  'wizard.import.drop.part1': 'ドロップしてください:',
  'wizard.import.drop.part2': 'ここに、またはクリックして選択',
  'wizard.import.backToClientStep': '← ステップ 5 に戻る（デスクトップクライアントを作成）',
  'wizard.import.okMessage':
    '✓ キーをインポートしました。Chronicle はシステムのキーチェーンに保存し、オンラインには保存しません。',
  'wizard.import.okNote':
    '必要であれば、ダウンロードしたファイルは今すぐ削除しても構いません。Chronicle があなたのファイルに触れることはありません。',
  'wizard.import.storageWarning':
    'OS のキーチェーンが検出されなかったため、キーは可逆なローカル暗号化で保存されます。ユーザーアカウントにアクセスできる人なら誰でも読み取れる可能性があります。',

  // Wizard — ConnectStep
  'wizard.connect.heading': 'ステップ 7: Google に接続する',
  'wizard.connect.why':
    'ブラウザで Google の同意画面が開きます。Chronicle はローカル（127.0.0.1）で応答を待ち受けます。トークンがこのマシンの外に出ることはありません。',
  'wizard.connect.warningTitle': '注意: 「未確認のアプリ」という警告について。',
  'wizard.connect.warning.part1': 'Google は',
  'wizard.connect.warning.quote': '「このアプリは Google で確認されていません」',
  'wizard.connect.warning.part2': 'と表示することがあります。これは想定どおりです。「未確認の開発者」とは',
  'wizard.connect.warning.you': 'あなた',
  'wizard.connect.warning.part3': 'のことです。',
  'wizard.connect.warning.advanced': '詳細',
  'wizard.connect.warning.goUnsafe': 'Chronicle に移動（安全ではありません）',
  'wizard.connect.warning.part4': 'をクリックしてください。自分自身のプロジェクトを信頼しているので、ここでは安全です。',
  'wizard.connect.button': 'Google に接続',
  'wizard.connect.buttonWaiting': 'ブラウザを待っています…',
  'wizard.connect.apiNotEnabledError': 'あなたのプロジェクトで YouTube Data API が有効になっていません。',
  'wizard.connect.testUserHint':
    'Google がサインインをブロックした場合、よくある原因は、プロジェクトがテストモードである間にテストユーザー（ステップ 4）が不足していることです。',
  'wizard.connect.fixItButton': '← ステップ {step} で修正する',
  'wizard.connect.connectedPlain': '✓ 接続しました。',
  'wizard.connect.connectedAs': '✓ {name} として接続しました。',
  'wizard.connect.closingNote':
    'Chronicle が知っているすべての情報はこのコンピューターに保存されます。あなたのキーは myaccount.google.com/permissions からいつでも取り消せます。',
  'wizard.connect.openChronicleButton': 'Chronicle を開く →',

  // App — feed buckets
  'app.bucket.today': '今日',
  'app.bucket.yesterday': '昨日',
  'app.bucket.thisWeek': '今週',
  'app.bucket.earlier': 'それ以前',
  'app.bucket.favoriteChannels': 'お気に入りのチャンネルから',

  // App — banners
  'app.banner.connectionFailed': '接続に失敗しました: {message}',
  'app.banner.reconnectRequired':
    'Google に再接続してください。認証の有効期限が切れました。（テストモードのプロジェクトは毎週期限切れになります。アプリを公開すると、これが恒久的に解決します。）',
  'app.banner.reconnectAction': '再接続',
  'app.banner.offline': 'オフラインのようです。ローカルデータを表示しています。更新すると再試行します。',
  'app.banner.refreshFailed': '更新に失敗しました: {message}',
  'app.banner.openVideoFailed': '動画を開けませんでした: {message}',
  'app.banner.refreshAllFailed':
    '更新でどのチャンネルにも到達できませんでした（{count} 件失敗）。接続を確認してください。次のサイクルで再試行します。',
  'app.banner.showDetails': '詳細',
  'app.banner.hideDetails': '詳細を隠す',
  'app.banner.showDetailsTitle': 'どのチャンネルが失敗したか、またその理由を表示',
  'app.banner.failureAccountLevel': 'アカウントレベル',
  'app.banner.quotaExceeded':
    '1日の API 上限に達しました。あなたの現地時間で {time} にリセットされます。Chronicle はローカルデータで引き続き動作します。RSS 経由の検出は無料で継続します。',
  'app.banner.signedOut': 'サインアウトしました。ローカルデータは保持されています。いつでも再接続できます。',
  'app.banner.updateAvailable': 'Chronicle {version} が利用可能です。',
  'app.banner.updateAction': 'リリースを見る',
  'app.banner.dismissTitle': '閉じる',
  'app.banner.newVideos': '新しい動画 {count} 件',
  'app.banner.unsubscribeFailed': '登録を解除できませんでした: {message}',
  'app.banner.searchFailed': '検索に失敗しました: {message}',
  'app.banner.subscribeFailed': '登録できませんでした: {message}',
  'app.banner.accountConnectFailed': 'アカウントを接続できませんでした: {message}',
  'app.banner.accountSyncFailed': 'このアカウントを同期できませんでした: {message}',
  'app.banner.removeAccountFailed': 'このアカウントを削除できませんでした: {message}',
  'app.banner.videoActionFailed': 'それを実行できませんでした: {message}',
  'app.writeScopeDialog.body':
    'この操作（高評価、登録、コメント）には、Google からの一度だけの追加の権限が Chronicle に必要です。続行すると、許可するためにブラウザが開きます。',
  'app.writeScopeDialog.cancel': '今はしない',
  'app.writeScopeDialog.continue': 'Google に進む',

  // App — sidebar
  'app.sidebar.showTitle': 'サイドバーを表示',

  // App — topbar
  'app.topbar.refreshTitle': '更新 (r)',
  'app.topbar.channelFallback': 'チャンネル',
  'app.topbar.markAllRead': 'すべて既読にする (M)',
  'app.topbar.searchYouTubePlaceholder': '検索',
  'app.topbar.searchChannelPlaceholder': 'このチャンネル内を検索',
  'app.topbar.clearFilterTitle': 'クリア',
  'app.topbar.itemSizeTitle': 'アイテムサイズ: {size}',
  'app.topbar.switchToListView': 'リスト表示に切り替え (v)',
  'app.topbar.switchToGridView': 'グリッド表示に切り替え (v)',
  'app.topbar.unsubscribe': '登録解除',
  'app.topbar.confirmUnsubscribe': 'もう一度クリックして登録を解除',
  'app.topbar.openChannelTitle': 'このチャンネルの YouTube ページを開く',
  'app.topbar.favoriteChannelTitle': 'お気に入り: メインフィードの上部に優先表示',
  'app.topbar.unfavoriteChannelTitle': 'お気に入り解除',

  // App — status text
  'app.status.filteringShorts': 'Shorts を識別中（{total} 件中 {checked} 件を確認済み）…',
  'app.status.checkingChannels': '{total} 件中 {checked} 件のチャンネルを確認中…',
  'app.status.refreshing': '更新中…',
  'app.status.caughtUp': 'すべて最新です',
  'app.status.lastRefreshSuffix': ' ・ 前回の更新 {time}',
  'app.status.unreadCount': '未読 {count} 件',
  'app.status.checkingChannelsInfo':
    '登録している各チャンネルのアップロードを確認し、前回の同期以降に公開された動画を探しています。',
  'app.status.filteringShortsInfo':
    '新しく見つかった動画のうち、どれが YouTube Shorts かを確認しています。',
  'app.status.refreshingInfo':
    'チャンネル登録を再度一覧表示してから、各チャンネルの新しい動画を確認しています。',

  // App — feed
  'app.feed.emptyFiltered': 'フィルターに一致するものがありません。',
  'app.feed.emptyNoVideos': 'まだここには何もありません。',

  // FeedList — shared between list rows and grid cards
  'feed.card.undoLabel': '無視しました: このビューから消えます',
  'feed.card.undoButton': '元に戻す (u)',
  'feed.card.undoLabelPlaylist': '再生リストから削除しました: このリストから消えます',
  'feed.card.undoButtonPlaylist': '元に戻す',
  'feed.card.favoriteTitle': 'お気に入り',
  'feed.card.watchLaterTitle': '後で見る',
  'feed.card.toggleReadTitle': '既読を切り替え (m)',
  'feed.card.ignoreTitle': '無視する (i)',
  'feed.card.toggleFavoriteTitle': 'お気に入りを切り替え (f)',
  'feed.card.toggleWatchLaterTitle': '後で見るを切り替え (w)',
  'feed.card.openInBrowserTitle': 'ブラウザで開く (b)',
  'feed.card.addToPlaylistTitle': '再生リストに追加',
  'feed.card.removeFromPlaylistTitle': 'この再生リストから削除',
  'feed.card.shortBadge': 'Short',
  'feed.card.liveBadge': 'ライブ',
  'feed.card.premiereBadge': 'プレミア公開',
  'feed.card.upcomingBadge': '公開予定',
  'feed.loadingMore': '読み込み中…',

  // PlayerView
  'player.topbar.back': '← 戻る',
  'player.topbar.backToFeed': '← フィードに戻る',
  'player.miniplayer.maximizeTitle': '通常のプレーヤーに戻す (e)',
  'player.miniplayer.closeTitle': '閉じる (x)',
  'player.extractTitle': '常に最前面の独立したウィンドウに切り離す (p)',
  'player.shareTitle': '共有',
  'player.miniplayer.resizeTitle': 'ドラッグしてサイズ変更',
  'player.overlay.back': '戻る (Esc)',
  'player.overlay.unavailableTitle': 'この動画はここでは再生できません。投稿者によって制限されているか、すでに利用できなくなっている可能性があります。',
  'player.overlay.removeFromLibrary': 'ライブラリから削除',
  'player.overlay.openInBrowser': 'ブラウザで開く',
  'player.action.markRead': '既読にする (m)',
  'player.action.markUnread': '未読にする (m)',
  'player.action.favorite': '☆ お気に入り (f)',
  'player.action.favorited': '★ お気に入り登録済み (f)',
  'player.action.watchLater': '後で見る (w)',
  'player.action.inWatchLater': '後で見るに追加済み (w)',
  'player.action.subscribe': 'チャンネル登録 (s)',
  'player.action.subscribed': '登録済み (s)',
  'player.action.ignore': '無視する (i)',
  'player.action.openInBrowser': 'ブラウザで開く (b)',
  'player.action.addToPlaylist': '再生リストに追加 (a)',
  'player.action.like': '高評価 (l)',
  'player.action.liked': '高評価済み (l)',
  'player.action.dislike': '低評価',
  'player.action.disliked': '低評価済み',
  'player.dislikeEstimate.disabledHint':
    '低評価数は YouTube によって廃止されました。クリックすると、設定でサードパーティサービスによる推定値を有効にできます。',
  'player.dislikeEstimate.errorHint':
    '現在、低評価数の推定値を読み込めませんでした。上の高評価数はいずれにせよ実数のままです。',
  'player.description.showMore': 'もっと見る',
  'player.description.showLess': '表示を減らす',
  'player.description.shortsLinkTitle': 'Shorts はブラウザで開きます（Chronicle は Shorts を再生しません）',
  'player.upNext.label': '「後で見る」からの次の動画',
  'player.upNext.labelPlaylist': '{name} の次の動画',
  'player.upNext.dismiss': '閉じる',
  'player.chat.toggle': 'ライブチャットを表示',
  'player.chat.extractTitle': 'チャットを独立したウィンドウに切り離す',
  'player.chat.signInInfo':
    'ライブチャットは YouTube から直接読み込まれるため、Chronicle 独自のサインインは引き継がれません。ここで別途、一度だけサインインする必要があります。',
  'player.chat.signInHint': 'チャットに参加しますか？ここでも YouTube にサインインする必要があります:',
  'player.chat.signInLink': 'YouTube にサインイン',
  'player.chat.signInWindowTitle': 'ライブチャット用にサインイン',

  // Sidebar
  'sidebar.collapseTitle': 'サイドバーを折りたたむ',
  'sidebar.view.all': 'すべて',
  'sidebar.view.unread': '未読',
  'sidebar.view.watchLater': '後で見る',
  'sidebar.view.favorites': 'お気に入り',
  'sidebar.view.playlists': '再生リスト',
  'sidebar.view.ignored': '無視したもの',
  'sidebar.channelsHeader': 'チャンネル',
  'sidebar.channelSortTitle': 'チャンネルを並べ替え',
  'sidebar.channelSort.favorites': 'お気に入り',
  'sidebar.channelSort.recent': '最近の更新順',
  'sidebar.channelSort.unread': '未読順',
  'sidebar.channelSort.name': '名前順',
  'sidebar.findChannelPlaceholder': 'チャンネルを検索  c',
  'sidebar.clearTitle': 'クリア',
  'sidebar.noChannelMatch': '一致するチャンネルがありません。',
  'sidebar.noChannels': 'このアカウントはまだどのチャンネルも登録していません。',
  'sidebar.settingsLabel': '設定',

  // Sidebar — Accounts (B-003)
  'sidebar.accountsHeader': 'アカウント',
  'sidebar.accountDisconnected': '再接続が必要です',
  'sidebar.addAccount': '+ アカウントを追加',
  'sidebar.accountMenu.title': 'その他',
  'sidebar.accountMenu.syncNow': '今すぐ同期',
  'sidebar.accountMenu.remove': 'アカウントを削除',
  'sidebar.accountMenu.confirmRemove': 'もう一度クリックして削除',
  'sidebar.accountMenu.removeDisabledTitle':
    'メインアカウントはここでは削除できません。代わりに設定の「サインアウト」を使用してください',
  'sidebar.channelMenu.title': 'その他',
  'sidebar.channelMenu.unsubscribe': '登録解除',
  'sidebar.channelMenu.confirmUnsubscribe': 'もう一度クリックして確認',
  'sidebar.channelMenu.favorite': 'お気に入り: メインフィードの上部に優先表示',
  'sidebar.channelMenu.unfavorite': 'お気に入り解除',
  'sidebar.channelMenu.notify': 'このチャンネルの新しい動画を通知する',
  'sidebar.channelMenu.unnotify': 'このチャンネルの通知を停止する',

  // YouTube search (B-009)
  'search.empty': '結果がありません。',
  'search.searching': 'YouTube 全体を検索中…',
  'search.searchingChannel': 'このチャンネル内を検索中…',
  'search.channelLoading': 'チャンネルを読み込み中…',
  'search.subscribeButton': 'チャンネル登録',
  'search.subscribedButton': '登録済み',
  'search.videoChannelPrefix': '投稿元:',
  'search.loadingMore': 'さらに結果を読み込み中…',

  // Comments (B-006)
  'comments.show': 'コメントを表示 (c)',
  'comments.hide': 'コメントを非表示 (c)',
  'comments.loading': 'コメントを読み込み中…',
  'comments.loadingMore': 'コメントをさらに読み込み中…',
  'comments.empty': 'まだコメントはありません。',
  'comments.reconnectRequired':
    '接続を更新する必要があります。コメントを見るには設定から再接続してください。',
  'comments.addPlaceholder': 'コメントを追加…',
  'comments.replyPlaceholder': '返信を書く…',
  'comments.postButton': '投稿',
  'comments.posting': '投稿中…',
  'comments.replyButton': '返信',
  'comments.openInBrowserTitle': 'ブラウザでコメントを開く',
  'comments.sortTop': '人気のコメント',
  'comments.sortNewest': '新しい順',
  'comments.editButton': '編集',
  'comments.saveButton': '保存',
  'comments.cancelButton': 'キャンセル',

  // Add another account (B-003)
  'addAccount.title': '別の Google アカウントを追加',
  'addAccount.instructions':
    '新しいアカウントのメールアドレスを、既存の Google Cloud プロジェクト（最初のセットアップと同じもの）のテストユーザーとして追加してから、下で接続してください。',
  'addAccount.openTestUsersLink': 'テストユーザー設定を開く',
  'addAccount.connectButton': 'Google アカウントを接続',
  'addAccount.connecting': 'ブラウザを待っています…',
  'addAccount.cancelButton': 'キャンセル',

  // Playlists — local-only, never synced to YouTube.
  'playlists.createButton': '+ 新しい再生リスト',
  'playlists.emptyTitle': 'まだ再生リストがありません。',
  'playlists.emptyHint': 'どの動画でも「再生リストに追加」を使って作成を始められます。',
  'playlists.videoCount': '動画 {count} 件',
  'playlists.dialog.createTitle': '新しい再生リスト',
  'playlists.dialog.nameLabel': '名前',
  'playlists.dialog.namePlaceholder': '再生リスト名',
  'playlists.dialog.descriptionLabel': '説明',
  'playlists.dialog.descriptionPlaceholder': '説明（任意）',
  'playlists.dialog.create': '作成',
  'playlists.dialog.cancel': 'キャンセル',

  // Import a YouTube playlist (D-059)
  'playlists.importButton': 'YouTube からインポート',
  'playlists.dialog.importTitle': 'YouTube の再生リストをインポート',
  'playlists.dialog.urlPlaceholder': 'YouTube の再生リストの URL を貼り付け',
  'playlists.dialog.import': 'インポート',
  'playlists.dialog.importing': 'インポート中…',
  'playlists.dialog.importLog.starting': '開始しています…',
  'playlists.dialog.importLog.meta': '再生リストの情報を取得中…',
  'playlists.dialog.importLog.collecting': 'これまでに {count} 件の動画が見つかりました…',
  'playlists.dialog.importLog.hydrating': '{total} 件中 {count} 件の動画をインポート済み…',
  'playlists.dialog.importLog.stillWorking': '処理中です: 大きな再生リストの場合、時間がかかることがあります…',
  'playlists.dialog.importLog.done': '完了: {total} 件中 {imported} 件の動画をインポートしました。',

  // Sync an imported playlist (D-059)
  'playlists.sync.upToDate': '最新の状態です',
  'playlists.sync.checkButton': '同期',
  'playlists.sync.button': '同期（新着 {count} 件）',
  'playlists.sync.syncing': '同期中…',

  'playlistDetail.editNameTitle': '名前を編集',
  'playlistDetail.editDescriptionTitle': '説明を編集',
  'playlistDetail.addDescriptionPlaceholder': '説明を追加…',
  'playlistDetail.saveTitle': '保存',
  'playlistDetail.cancelEditTitle': 'キャンセル',
  'playlistDetail.deleteButton': '再生リストを削除',
  'playlistDetail.confirmDelete': 'もう一度クリックして確認',
  'playlistDetail.empty': 'この再生リストは空です。',
  'playlistDetail.emptyHint': 'どの動画でも「再生リストに追加」を使ってここに追加できます。',

  'addToPlaylist.title': '再生リストに追加',
  'addToPlaylist.empty': 'まだ再生リストがありません。下から作成してください。',
  'addToPlaylist.newPlaylistPlaceholder': '新しい再生リストの名前',
  'addToPlaylist.create': '作成',
  'addToPlaylist.done': '完了',

  'share.title': '共有',
  'share.copy': 'コピー',
  'share.copied': 'コピーしました',
  'share.includeTimestamp': '現在のタイムスタンプを含める ({time})',
  'share.done': '完了'
}

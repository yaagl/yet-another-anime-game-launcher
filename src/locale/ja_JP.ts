import { zh_CN } from "./zh_CN";

export const ja_JP: typeof zh_CN = {
  CONTENT_LANG_ID: "ja-jp",
  LAUNCH: "ゲーム開始",
  INSTALL: "ゲームをインストール",
  UPDATING: "更新中",
  DOWNLOADING: "ダウンロード中",
  FIXING_FILES: "ゲームファイルを修復中{0}/{1}",
  PATCHING: "ゲームファイルをパッチ中",
  GAME_RUNNING: "ゲーム実行中 (ランチャーを閉じないでください)",
  REVERT_PATCHING: "パッチを元に戻し中",
  SCANNING_FILES: "ゲームファイルの整合性を確認中. 完了ファイル{0}/{1}",
  DOWNLOADING_ENVIRONMENT: "環境ファイルダウンロード中",
  DOWNLOADING_ENVIRONMENT_SPEED: "環境ファイルダウンロード中({0}/秒)",
  EXTRACT_ENVIRONMENT: "環境解凍中",
  CONFIGURING_ENVIRONMENT: "環境構成中",
  RESTART_TO_INSTALL: "プログラム再起動",
  PATH_INVALID: "パスが無効です",
  PLEASE_SELECT_A_DIR: "パスを選択してください",
  PATH_INVALID_ASCII_ONLY:
    "パスにはASCII文字のみが含まれていることを確認してください。",
  PATH_INVALID_FORBIDDEN_DIR:
    "「デスクトップ」、「ダウンロード」又は「書類」以外パスを選択してください",
  NOT_SUPPORTED_YET: "非対応機能です",
  PLEASE_WAIT_FOR_LAUNCHER_UPDATE:
    "ただ今、ランチャーはバージョン {0} に対応していません。今後の更新をお待ちください。",
  UNSUPPORTED_VERSION: "非対応バージョンです",
  SELECT_INSTALLATION_DIR:
    "ゲームディレクトリを選択してください。\nゲームを既にインストールしている場合は、ゲームの実行ファイルが保存されている場所を選択してください。",
  CANT_OPEN_GAME_FILE: "ゲームファイルにアクセスできませんでした。",
  CANT_OPEN_GAME_FILE_DESC:
    "ランチャーがゲームファイルにアクセスできませんでした。\nこのダイアログボックスを閉じた後、ゲームのインストール先を変更してください。\n\nこのダイアログボックスが繰り返し表示される場合は、ランチャーがゲームディレクトリにアクセスする権限を持っていることを確認してください。",
  GAME_DIR_CHANGED: "ゲームディレクトリのパスが変更されました。",
  GAME_DIR_CHANGED_DESC:
    "ゲームパスを変更しました。この操作は非対応ですが、後で調整できます。",

  NEW_VERSION_AVAILABLE: "新しいアップデートが利用可能です",
  NEW_VERSION_AVAILABLE_DESC:
    "ランチャーをバージョン {0} に更新しますか？\n 更新内容:\n{1}",

  DOWNLOADING_UPDATE_FILE: "更新ファイルダウンロード中",

  UPGRADE_FUNCTION_TBD: "ただ今、更新機能は実装されていません。",

  DECOMPRESS_FILE_PROGRESS: "ファイル解凍中",
  ALLOCATING_FILE: "ディクス上ファイルを割り当て中",
  DOWNLOADING_FILE_PROGRESS: "ファイルダウンロード中: {0} ({2}/{3}) {1}/秒",

  BACKUP_USER_DATA: "ユーザーデータバックアップ中",
  RECOVER_BACKUP_USER_DATA: "バックアップ復元中",

  INSTALL_DONE: "完了",

  RELAUNCH_REQUIRED: "ランチャーの再起動が必要です",
  RELAUNCH_REQUIRED_DESC:
    "Wineのインストールを完了するために、ランチャーが再起動します。",

  SETTING: "設定",
  SETTING_WINE_VERSION: "Wineディストリビューション",
  SETTING_ASYNC_DXVK: "DXVK 非同期シェーダーコンパイル",
  SETTING_ENABLED: "有効",
  SETTING_DXVK_HUD: "DXVK HUD",
  SETTING_DXVK_HUD_NONE: "なし",
  SETTING_DXVK_HUD_FPS: "FPSのみ",
  SETTING_DXVK_HUD_ALL: "全部",
  SETTING_MTL_HUD: "Metal HUD",
  SETTING_RETINA: "Retinaモード",
  SETTING_LEFT_CMD: "左CMDキーをCTRLキーにマップ",
  SETTING_TURN_OFF_AC_PATCH: "ACパッチを無効にする",
  SETTING_CUSTOM_RESOLUTION: "カスタム解像度",
  SETTING_SAVE: "保存",
  SETTING_CANCEL: "キャンセル",

  SETTING_CHECK_INTEGRITY: "整合性確認",
  SETTING_GAME_INSTALL_DIR: "ゲームインストールディレクトリ",
  // 0.0.27
  SETTING_WINE_VERSION_CONFIRM:
    "変更を確認するには、ここをクリックしてください。",
  SETTING_QUICK_ACTIONS: "クイックアクション",
  SETTING_GENERAL: "全般",
  SETTING_GAME: "ゲーム",
  LANGUAGE_LOCALE_NAME: "日本語",
  SETTING_UI_LOCALE: "ランチャー言語",
  SETTING_RESTART_TO_TAKE_EFFECT: "再起動後に有効になります。",
  SETTING_OPEN_CMD: "Wineコマンドラインツールを起動",
  SETTING_OPEN_GAME_INSTALL_DIR: "ゲームインストールディレクトリを開く",
  SETTING_OPEN_YAAGL_DIR: "YAAGLデータディレクトリを開く",
  SETTING_YAAGL_VERSION: "YAAGLバージョン",

  SETTING_FPS_UNLOCK: "FPS制限解除",
  SETTING_FPS_UNLOCK_DEFAULT: "無効",

  SETTING_ADVANCED: "詳細",
  SETTING_ADVANCED_ALERT:
    "何が起きるか分からない場合は、絶対に何も変更しないでください。",
  SETTING_ADVANCED_VISIBLE: "詳細設定が利用可能になりました。",

  NO_ENOUGH_DISKSPACE: "ディスクの空き容量が足りません。",
  NO_ENOUGH_DISKSPACE_DESC:
    "ディスクに少なくとも {0}GiB（{1}GB）の空き容量が必要です。",

  UPDATE: "ゲーム更新",
  GAME_VERSION_TOO_OLD_DESC:
    "現在お使いゲームバージョン（{0}）は古すぎるため、増分更新を行うことができません。ゲームを再インストールしてください。",

  PREDOWNLOAD_READY: "事前ダウンロード{0}",

  COMMUNITY_WARNING: "コミュニティ警告",
  COMMUNITY_WINE_ALERT:
    "現在選択されているのはコミュニティ版です。このバージョンは公式にサポートされていませんので、不具合の報告はご遠慮ください。",

  SETTING_BLOCK_NET: "起動修正（ホストのブロック）",
  SETTING_TIMEOUT_FIX: "タイムアウト修正",
  SETTING_LICENSES: "ライセンス",
  SETTING_ENABLE_HDR: "HDR有効",

  SETTING_PROXY_ENABLED: "HTTPプロキシ有効",
  SETTING_PROXY_HOST: "HTTPプロキシホスト",
  SETTING_PROXY_DESC:
    "このプロキシ設定はゲームのみに適用され、ランチャー全体には適用されません。",

  SETTING_TURN_ON_STEAM_PATCH: "Steamパッチ有効",

  UPDATE_PROMPT_IGNORE: "更新無視",
  SETTING_CHECK_UPDATE: "YAAGL更新を確認する",
  ALREADY_LATEST_VERSION: "既に最新バージョンを使用しています。",
  UPDATE_LAUNCHER: "ランチャー更新",
};

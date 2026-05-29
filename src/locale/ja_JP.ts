import { SuppportedContentLangId } from "./supported-content-lang-id";
import { zh_CN } from "./zh_CN";

export const ja_JP: typeof zh_CN = {
  CONTENT_LANG_ID: "ja-jp" as SuppportedContentLangId,
  LAUNCH: "ゲームを起動",
  INSTALL: "ゲームをインストール",
  UPDATING: "更新中",
  DOWNLOADING: "ダウンロード中",
  FIXING_FILES: "ゲームファイルを修復中 {0}/{1}",
  PATCHING: "ゲームファイルにパッチを適用中",
  GAME_RUNNING: "ゲームが起動中です（ランチャーを閉じないでください）",
  REVERT_PATCHING: "パッチを元に戻しています",
  SCANNING_FILES: "ゲームファイルの整合性を確認中。{0}/{1}個完了",
  DOWNLOADING_ENVIRONMENT: "実行環境ファイルをダウンロード中",
  DOWNLOADING_ENVIRONMENT_SPEED: "実行環境ファイルをダウンロード中（{0}/s）",
  EXTRACT_ENVIRONMENT: "実行環境を展開中",
  CONFIGURING_ENVIRONMENT: "実行環境を設定中",
  RESTART_TO_INSTALL: "プログラムを再起動してください",
  PATH_INVALID: "パスが無効です",
  PLEASE_SELECT_A_DIR: "パスを選択してください",
  PATH_INVALID_ASCII_ONLY: "パスにはASCII文字のみを含めてください。",
  PATH_INVALID_FORBIDDEN_DIR:
    '「Desktop」「Downloads」「Documents」の中ではないパスを選んでください',
  NOT_SUPPORTED_YET: "未対応の機能です",
  PLEASE_WAIT_FOR_LAUNCHER_UPDATE:
    "ランチャーは現在バージョン{0}をサポートしていません。続報をお待ちください。",
  UNSUPPORTED_VERSION: "未対応のバージョンです",
  SELECT_INSTALLATION_DIR:
    "ゲームのインストール先フォルダを選択してください。\nすでにゲームをインストール済みの場合は、ゲーム実行ファイルのある場所を選択してください。",
  CANT_OPEN_GAME_FILE: "ゲームファイルにアクセスできません",
  CANT_OPEN_GAME_FILE_DESC:
    "ランチャーがゲームファイルにアクセスできませんでした。\nこのダイアログを閉じた後、ゲームのインストール先を調整してください。\n\nこのダイアログが繰り返し表示される場合は、ランチャーにゲームフォルダへのアクセス権限があるか確認してください。",
  GAME_DIR_CHANGED: "ゲームフォルダのパスが変更されました。",
  GAME_DIR_CHANGED_DESC:
    "ゲームのパスを変更しました。この操作は未対応ですが、後から調整できます。",

  NEW_VERSION_AVAILABLE: "新しい更新があります",
  NEW_VERSION_AVAILABLE_DESC:
    "ランチャーをバージョン{0}へ更新しますか？\n変更内容:\n{1}",

  DOWNLOADING_UPDATE_FILE: "更新ファイルをダウンロード中",

  UPGRADE_FUNCTION_TBD: "現在、更新機能は実装されていません。",

  DECOMPRESS_FILE_PROGRESS: "ファイルを展開中",
  ALLOCATING_FILE: "ディスク上にファイルを割り当て中",
  DOWNLOADING_FILE_PROGRESS: "ファイルをダウンロード中: {0} ({2}/{3}) {1}/s",

  BACKUP_USER_DATA: "ユーザーデータをバックアップ中",
  RECOVER_BACKUP_USER_DATA: "バックアップを復元中",

  INSTALL_DONE: "完了",

  RELAUNCH_REQUIRED: "ランチャーの再起動が必要です",
  RELAUNCH_REQUIRED_DESC:
    "Wineのインストールを完了するため、ランチャーを再起動します。",

  SETTING: "設定",
  SETTING_WINE_VERSION: "Wine配布版",
  SETTING_ASYNC_DXVK: "DXVKの非同期シェーダーコンパイル",
  SETTING_ENABLED: "有効",
  SETTING_DXVK_HUD: "DXVK HUD",
  SETTING_DXVK_HUD_NONE: "なし",
  SETTING_DXVK_HUD_FPS: "FPSのみ",
  SETTING_DXVK_HUD_ALL: "すべて",
  SETTING_MTL_HUD: "Metal HUD",
  SETTING_RETINA: "Retinaモード",
  SETTING_LEFT_CMD: "左CmdをCtrlに割り当て",
  SETTING_TURN_OFF_AC_PATCH: "ACパッチを無効にする",
  SETTING_CUSTOM_RESOLUTION: "カスタム解像度",
  SETTING_SAVE: "保存",
  SETTING_CANCEL: "キャンセル",

  SETTING_CHECK_INTEGRITY: "整合性を確認",
  SETTING_GAME_INSTALL_DIR: "ゲームのインストール先フォルダ",
  // 0.0.27
  SETTING_WINE_VERSION_CONFIRM: "変更を確定するにはここをクリックしてください。",
  SETTING_QUICK_ACTIONS: "クイック操作",
  SETTING_GENERAL: "一般",
  SETTING_GAME: "ゲーム",
  LANGUAGE_LOCALE_NAME: "日本語",
  SETTING_UI_LOCALE: "ランチャーUIの言語",
  SETTING_RESTART_TO_TAKE_EFFECT: "再起動後に反映されます。",
  SETTING_OPEN_CMD: "Wineコマンドラインツールを起動",
  SETTING_OPEN_GAME_INSTALL_DIR: "ゲームのインストール先フォルダを開く",
  SETTING_OPEN_YAAGL_DIR: "YAAGLデータフォルダを開く",
  SETTING_YAAGL_VERSION: "YAAGLのバージョン",

  SETTING_FPS_UNLOCK: "FPS制限解除",
  SETTING_FPS_UNLOCK_DEFAULT: "無効",

  SETTING_ADVANCED: "詳細設定",
  SETTING_ADVANCED_ALERT: "何をしているか分からないなら、何も変更しないでください。",
  SETTING_ADVANCED_VISIBLE: "詳細設定が利用可能になりました。",

  NO_ENOUGH_DISKSPACE: "ディスクの空き容量が不足しています。",
  NO_ENOUGH_DISKSPACE_DESC:
    "ディスクには少なくとも {0}GiB ({1}GB) の空き容量が必要です。",

  UPDATE: "ゲームを更新",
  GAME_VERSION_TOO_OLD_DESC:
    "現在のゲームバージョン({0})は古すぎるため、段階的な更新はできません。ゲームを再インストールしてください。",

  PREDOWNLOAD_READY: "事前ダウンロード {0}",

  COMMUNITY_WARNING: "コミュニティ版の警告",
  COMMUNITY_WINE_ALERT:
    "現在選択されているのはコミュニティ版です。このバージョンは公式にサポートされていません。問題の報告はしないでください。",

  SETTING_BLOCK_NET: "起動時の修正（hostsの変更）",
  SETTING_TIMEOUT_FIX: "タイムアウト修正",
  SETTING_LICENSES: "ライセンス",
  SETTING_ENABLE_HDR: "HDRを有効にする",

  SETTING_PROXY_ENABLED: "HTTPプロキシを有効にする",
  SETTING_PROXY_HOST: "HTTPプロキシホスト",
  SETTING_PROXY_DESC: "プロキシはゲームにのみ適用され、ランチャー全体には適用されません。",

  SETTING_TURN_ON_STEAM_PATCH: "Steamパッチを有効にする",

  UPDATE_PROMPT_IGNORE: "更新を無視",
  SETTING_CHECK_UPDATE: "YAAGLの更新を確認",
  ALREADY_LATEST_VERSION: "すでに最新バージョンを使用しています。",
  UPDATE_LAUNCHER: "ランチャーを更新",
};
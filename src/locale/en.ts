import { zh_CN } from "./zh_CN";

export const en: typeof zh_CN = {
  CONTENT_LANG_ID: "en-us",
  LAUNCH: "Launch Game",
  INSTALL: "Install Game",
  UPDATING: "Updating",
  DOWNLOADING: "Downloading",
  FIXING_FILES: "Fixing game files {0}/{1}",
  PATCHING: "Patching game files",
  GAME_RUNNING: "Game is running (DO NOT CLOSE THE LAUNCHER)",
  REVERT_PATCHING: "Reverting patches",
  SCANNING_FILES: "Checking game file integrity. Completed files {0}/{1}",
  DOWNLOADING_ENVIRONMENT: "Downloading environment files",
  DOWNLOADING_ENVIRONMENT_SPEED: "Downloading environment files ({0}/s)",
  EXTRACT_ENVIRONMENT: "Extracting environment",
  CONFIGURING_ENVIRONMENT: "Configuring environment",
  RESTART_TO_INSTALL: "Restart the program",
  PATH_INVALID: "Path is invalid",
  PLEASE_SELECT_A_DIR: "Please select a path",
  PATH_INVALID_ASCII_ONLY:
    "Please ensure that the path only contains ASCII characters.",
  PATH_INVALID_FORBIDDEN_DIR:
    'Please choose a path that is not inside "Desktop", "Downloads" or "Documents"',
  NOT_SUPPORTED_YET: "Unsupported feature",
  PLEASE_WAIT_FOR_LAUNCHER_UPDATE:
    "The launcher does not currently support version {0}. Please wait for further updates.",
  UNSUPPORTED_VERSION: "Unsupported version",
  SELECT_INSTALLATION_DIR:
    "Please select the game installation directory.\nIf you have already installed the game, select where the game executable file is located.",
  CANT_OPEN_GAME_FILE: "Failed to access game files.",
  CANT_OPEN_GAME_FILE_DESC:
    "The launcher failed to access the game files.\nPlease adjust the game installation directory after this dialog.\n\nIf this dialog appears repeatedly, please ensure that the launcher has the permission to access the game directory.",
  GAME_DIR_CHANGED: "The path to the game directory has changed.",
  GAME_DIR_CHANGED_DESC:
    "You have changed your game path. This operation is unsupported, but you can adjust this later.",

  NEW_VERSION_AVALIABLE: "A new update is avaliable",
  NEW_VERSION_AVALIABLE_DESC:
    "Would you like to update launcher to version {0}?\n Changes:\n{1}",

  DOWNLOADING_UPDATE_FILE: "Downloading update files",

  UPGRADE_FUNCTION_TBD: "Currently, updating is not implemented.",

  DECOMPRESS_FILE_PROGRESS: "Decompressing files",
  ALLOCATING_FILE: "Allocating files on disk",
  DOWNLOADING_FILE_PROGRESS: "Downloading file: {0} ({2}/{3}) {1}/s",

  BACKUP_USER_DATA: "Backing up user data",
  RECOVER_BACKUP_USER_DATA: "Recovering backup",

  INSTALL_DONE: "Done",

  RELAUNCH_REQUIRED: "Launcher restart required",
  RELAUNCH_REQUIRED_DESC:
    "The launcher will restart to complete the wine installation.",

  SETTING: "Settings",
  SETTING_WINE_VERSION: "Wine Distribution",
  SETTING_ASYNC_DXVK: "DXVK Asynchronous Shader Compiling",
  SETTING_ENABLED: "Enabled",
  SETTING_DXVK_HUD: "DXVK HUD",
  SETTING_DXVK_HUD_NONE: "None",
  SETTING_DXVK_HUD_FPS: "FPS only",
  SETTING_DXVK_HUD_ALL: "Everything",
  SETTING_MTL_HUD: "Metal HUD",
  SETTING_RETINA: "Retina Mode",
  SETTING_LEFT_CMD: "Map left CMD to CTRL",
  SETTING_TURN_OFF_AC_PATCH: "Turn off the AC patch",
  SETTING_SAVE: "Save",
  SETTING_CANCEL: "Cancel",

  SETTING_CHECK_INTEGRITY: "Check Integrity",
  SETTING_GAME_INSTALL_DIR: "Game Installation Directory",
  // 0.0.27
  SETTING_WINE_VERSION_CONFIRM: "Click here to confirm the change.",
  SETTING_QUICK_ACTIONS: "Quick Actions",
  SETTING_GENERAL: "General",
  SETTING_GAME: "Game",
  LANGUAGE_LOCALE_NAME: "English",
  SETTING_UI_LOCALE: "Launcher UI Language",
  SETTING_RESTART_TO_TAKE_EFFECT: "This will take effect after restart.",
  SETTING_OPEN_CMD: "Launch Wine Command Line Tool",
  SETTING_OPEN_GAME_INSTALL_DIR: "Open Game Install Directory",
  SETTING_OPEN_YAAGL_DIR: "Open YAAGL Data Directory",
  SETTING_YAAGL_VERSION: "YAAGL Version",

  SETTING_WINE_CROSSOVER_ALERT:
    "To use Crossover, there is an additional manual step. Click here to learn more.",

  SETTING_FPS_UNLOCK: "Unlock FPS Limit",
  SETTING_FPS_UNLOCK_DEFAULT: "Disabled",

  SETTING_ADVANCED: "Advanced",
  SETTING_ADVANCED_ALERT:
    "DO NOT CHANGE ANYTHING, unless you know what you are doing.",
  SETTING_ADVANCED_VISIBLE: "Advanced settings are now available.",

  NO_ENOUGH_DISKSPACE: "Not enough free space on disk.",
  NO_ENOUGH_DISKSPACE_DESC:
    "At least {0}GiB ({1}GB) of freespace is required on your disk.",

  UPDATE: "Update Game",
  GAME_VERSION_TOO_OLD_DESC:
    "Your current game version ({0}) is too old to update incrementally. Please re-install the game.",

  PREDOWNLOAD_READY: "Pre-download {0}",

  COMMUNITY_WARNING: "Community Warning",
  COMMUNITY_WINE_ALERT:
    "The current selection is the Community version, this version is not officially supported, please do not report any issues",

  SETTING_BLOCK_NET: "Launch Fix(block hosts)",
  SETTING_LICENSES: "Licenses",
};

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
  PATH_INVALID_ASCII_ONLY: "Please ensure that the path contains only ASCII characters",
  PATH_INVALID_FORBIDDEN_DIR: 'Please choose a path that is not inside "Desktop","Downloads" or "Documents"',
  NOT_SUPPORTED_YET: "Feature not supported yet",
  PLEASE_WAIT_FOR_LAUNCHER_UPDATE: "The launcher doesn't support version {0} currently, please wait for updates",
  UNSUPPORTED_VERSION: "Not a supported version",
  SELECT_INSTALLATION_DIR: "Please select the game installation directory.\nIf you have already installed the game, select where the game executable file is located",
  CANT_OPEN_GAME_FILE: "Failed to access game file",
  CANT_OPEN_GAME_FILE_DESC: "Launcher failed to access game file.\nBut no worry, you can select the game installation directory again when this dialog closed\n\nIf this dialog appears repeatedly, please check whether the launcher has the right permission to access the game installation directory",
  GAME_DIR_CHANGED: "The path to directory changed",
  GAME_DIR_CHANGED_DESC: "Seems you selected another path that is different from the one previously selected. This operation is invalid, but you can reselect later",

  NEW_VERSION_AVALIABLE: "New version avaliable",
  NEW_VERSION_AVALIABLE_DESC: "Would you like to upgrade launcher to version {0}?\n What's updated:\n{1}",

  DOWNLOADING_UPDATE_FILE: "Downloding update files",

  UPGRADE_FUNCTION_TBD: "Currently upgrading is not implemented",

  DECOMPRESS_FILE_PROGRESS:"Decompressing files",
  ALLOCATING_FILE: "Allocating files on disk",
  DOWNLOADING_FILE_PROGRESS:"Downloading file: {0} ({2}/{3}) {1}/s",

  BACKUP_USER_DATA: "Backing up user data",
  RECOVER_BACKUP_USER_DATA: "Recovering backup",

  INSTALL_DONE: "Done",

  RELAUNCH_REQUIRED: "Relaunch required",
  RELAUNCH_REQUIRED_DESC: "The launcher will restart to process the wine installation.",

  SETTING: "Settings",
  SETTING_WINE_VERSION: "Wine Distribution",
  SETTING_ASYNC_DXVK: "DXVK Asynchronous Shader Compiling",
  SETTING_ENABLED: "Enabled",
  SETTING_DXVK_HUD: "DXVK HUD",
  SETTING_DXVK_HUD_NONE: "None",
  SETTING_DXVK_HUD_FPS: "FPS only",
  SETTING_DXVK_HUD_ALL: "Everything",
  SETTING_RETINA: "Retina Mode",
  SETTING_SAVE: "Save",
  SETTING_CANCEL: "Cancel",

  SETTING_CHECK_INTEGRITY: "Check Integrity",
  SETTING_GAME_INSTALL_DIR: "Game Installation Directory",
  // 0.0.27
  SETTING_WINE_VERSION_CONFIRM: "Click me to confirm the change",
  SETTING_QUICK_ACTIONS: "Quick Actions",
  SETTING_GENERAL: "General",
  LANGUAGE_LOCALE_NAME: "English",
  SETTING_UI_LOCALE: "Launcher UI Language",
  SETTING_RESTART_TO_TAKE_EFFECT: "It will take effect after restart.",
  SETTING_OPEN_CMD: "Open Wine Command Line Tool",
  SETTING_OPEN_GAME_INSTALL_DIR: "Open Game Install Directory",
  SETTING_OPEN_YAAGL_DIR: "Open Yaagl Data Directory",


  SETTING_WINE_CROSSOVER_ALERT: "To use crossover, there is an additional step that must be done manually. Click this box to learn about the detail.",

  SETTING_FPS_UNLOCK: "Unlock FPS Limit",
  SETTING_FPS_UNLOCK_DEFAULT: "Disabled",

  SETTING_ADVANCED: "Advanced",
  SETTING_ADVANCED_ALERT: "DO NOT CHANGE ANYTHING, unless you know what you are doing.",
  SETTING_ADVANCED_VISIBLE: "Advanced settings are visible now.",


  NO_ENOUGH_DISKSPACE: "No enough freespace on disk",
  NO_ENOUGH_DISKSPACE_DESC: "At least {0}G of freespace is required.",
};

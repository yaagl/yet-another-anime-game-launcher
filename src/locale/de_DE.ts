import { zh_CN } from "./zh_CN";
import { en } from "@locale/en";

export const de_DE: typeof zh_CN = {
  CONTENT_LANG_ID: "de-de",
  LAUNCH: "Spiel starten",
  INSTALL: "Spiel installieren",
  UPDATING: "Aktualisieren",
  DOWNLOADING: "Herunterladen",
  FIXING_FILES: "Spieldateien reparieren {0}/{1}",
  PATCHING: "Spieldateien patchen",
  GAME_RUNNING: "Spiel läuft (SCHLIESSEN SIE DEN LAUNCHER NICHT)",
  REVERT_PATCHING: "Patches rückgängig machen",
  SCANNING_FILES:
    "Überprüfe Integrität der Spieldateien. Abgeschlossene Dateien {0}/{1}",
  DOWNLOADING_ENVIRONMENT: "Umgebungsdateien herunterladen",
  DOWNLOADING_ENVIRONMENT_SPEED: "Umgebungsdateien herunterladen ({0}/s)",
  EXTRACT_ENVIRONMENT: "Umgebung entpacken",
  CONFIGURING_ENVIRONMENT: "Umgebung konfigurieren",
  RESTART_TO_INSTALL: "Programm neu starten",
  PATH_INVALID: "Pfad ist ungültig",
  PLEASE_SELECT_A_DIR: "Bitte wählen Sie einen Pfad",
  PATH_INVALID_ASCII_ONLY:
    "Bitte stellen Sie sicher, dass der Pfad nur ASCII-Zeichen enthält.",
  PATH_INVALID_FORBIDDEN_DIR:
    'Bitte wählen Sie einen Pfad, der nicht in "Desktop", "Downloads" oder "Dokumente" liegt',
  NOT_SUPPORTED_YET: "Nicht unterstützte Funktion",
  PLEASE_WAIT_FOR_LAUNCHER_UPDATE:
    "Der Launcher unterstützt derzeit Version {0} nicht. Bitte warten Sie auf weitere Updates.",
  UNSUPPORTED_VERSION: "Nicht unterstützte Version",
  SELECT_INSTALLATION_DIR:
    "Bitte wählen Sie das Installationsverzeichnis des Spiels.\nWenn Sie das Spiel bereits installiert haben, wählen Sie das Verzeichnis, in dem sich die ausführbare Spieldatei befindet.",
  CANT_OPEN_GAME_FILE: "Zugriff auf Spieldateien fehlgeschlagen.",
  CANT_OPEN_GAME_FILE_DESC:
    "Der Launcher konnte nicht auf die Spieldateien zugreifen.\nBitte passen Sie das Installationsverzeichnis des Spiels nach diesem Dialog an.\n\nWenn dieser Dialog wiederholt angezeigt wird, stellen Sie bitte sicher, dass der Launcher die Berechtigung hat, auf das Spielverzeichnis zuzugreifen.",
  GAME_DIR_CHANGED: "Der Pfad zum Spielverzeichnis wurde geändert.",
  GAME_DIR_CHANGED_DESC:
    "Sie haben Ihren Spielpfad geändert. Diese Operation wird nicht unterstützt, kann jedoch später angepasst werden.",

  NEW_VERSION_AVALIABLE: "Ein neues Update ist verfügbar",
  NEW_VERSION_AVALIABLE_DESC:
    "Möchten Sie den Launcher auf Version {0} aktualisieren?\n Änderungen:\n{1}",

  DOWNLOADING_UPDATE_FILE: "Update-Dateien herunterladen",

  UPGRADE_FUNCTION_TBD: "Aktualisierung ist derzeit nicht implementiert.",

  DECOMPRESS_FILE_PROGRESS: "Dateien entpacken",
  ALLOCATING_FILE: "Dateien auf der Festplatte zuweisen",
  DOWNLOADING_FILE_PROGRESS: "Datei herunterladen: {0} ({2}/{3}) {1}/s",

  BACKUP_USER_DATA: "Benutzerdaten sichern",
  RECOVER_BACKUP_USER_DATA: "Sicherung wiederherstellen",

  INSTALL_DONE: "Fertig",

  RELAUNCH_REQUIRED: "Neustart des Launchers erforderlich",
  RELAUNCH_REQUIRED_DESC:
    "Der Launcher wird neu gestartet, um die Wine-Installation abzuschließen.",

  SETTING: "Einstellungen",
  SETTING_WINE_VERSION: "Wine-Distribution",
  SETTING_ASYNC_DXVK: "DXVK Asynchrones Shader-Kompilieren",
  SETTING_ENABLED: "Aktiviert",
  SETTING_DXVK_HUD: "DXVK HUD",
  SETTING_DXVK_HUD_NONE: "Keine",
  SETTING_DXVK_HUD_FPS: "Nur FPS",
  SETTING_DXVK_HUD_ALL: "Alles",
  SETTING_MTL_HUD: "Metal HUD",
  SETTING_RETINA: "Retina-Modus",
  SETTING_LEFT_CMD: "Linke CMD zu CTRL zuordnen",
  SETTING_TURN_OFF_AC_PATCH: "AC-Patch deaktivieren",
  SETTING_SAVE: "Speichern",
  SETTING_CANCEL: "Abbrechen",

  SETTING_CHECK_INTEGRITY: "Integrität prüfen",
  SETTING_GAME_INSTALL_DIR: "Spiel-Installationsverzeichnis",
  // 0.0.27
  SETTING_WINE_VERSION_CONFIRM: "Hier klicken, um die Änderung zu bestätigen.",
  SETTING_QUICK_ACTIONS: "Schnellaktionen",
  SETTING_GENERAL: "Allgemein",
  SETTING_GAME: "Spiel",
  LANGUAGE_LOCALE_NAME: "Deutsch",
  SETTING_UI_LOCALE: "Launcher UI-Sprache",
  SETTING_RESTART_TO_TAKE_EFFECT: "Dies wird nach dem Neustart wirksam.",
  SETTING_OPEN_CMD: "Wine-Kommandozeilenwerkzeug starten",
  SETTING_OPEN_GAME_INSTALL_DIR: "Spiel-Installationsverzeichnis öffnen",
  SETTING_OPEN_YAAGL_DIR: "YAAGL-Datenverzeichnis öffnen",
  SETTING_YAAGL_VERSION: "YAAGL-Version",

  SETTING_WINE_CROSSOVER_ALERT:
    "Um Crossover zu verwenden, ist ein zusätzlicher manueller Schritt erforderlich. Klicken Sie hier, um mehr zu erfahren.",

  SETTING_FPS_UNLOCK: "FPS-Limit aufheben",
  SETTING_FPS_UNLOCK_DEFAULT: "Deaktiviert",

  SETTING_ADVANCED: "Erweitert",
  SETTING_ADVANCED_ALERT:
    "ÄNDERN SIE NICHTS, es sei denn, Sie wissen, was Sie tun.",
  SETTING_ADVANCED_VISIBLE: "Erweiterte Einstellungen sind jetzt verfügbar.",

  NO_ENOUGH_DISKSPACE:
    "Nicht genügend freier Speicherplatz auf der Festplatte.",
  NO_ENOUGH_DISKSPACE_DESC:
    "Mindestens {0}GiB ({1}GB) freier Speicherplatz ist auf Ihrer Festplatte erforderlich.",

  UPDATE: "Spiel aktualisieren",
  GAME_VERSION_TOO_OLD_DESC:
    "Ihre aktuelle Spielversion ({0}) ist zu alt, um inkrementell aktualisiert zu werden. Bitte installieren Sie das Spiel neu.",

  PREDOWNLOAD_READY: "Pre-Download {0}",

  COMMUNITY_WARNING: "Gemeiner alarm.",
  COMMUNITY_WINE_ALERT:
    "Aktuelle version als gemeindeversion, die nicht offiziell unterstützt wird. Bitte berichten sie nicht über Fragen.",

  SETTING_BLOCK_NET: "Launch Fix(block hosts)",
  SETTING_LICENSES: en.SETTING_LICENSES,
};

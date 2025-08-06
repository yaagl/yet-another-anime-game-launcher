import { zh_CN } from "./zh_CN";
import { en } from "@locale/en";

export const fr_FR: typeof zh_CN = {
  CONTENT_LANG_ID: "fr-fr",
  LAUNCH: "Lancer le jeu",
  INSTALL: "Installer le jeu",
  UPDATING: "Mise à jour",
  DOWNLOADING: "Téléchargement",
  FIXING_FILES: "Correction des fichiers de jeu {0}/{1}",
  PATCHING: "Ajout de correctifs sur les fichiers du jeu",
  GAME_RUNNING: "Le jeu est lancé (NE FERMEZ PAS LE LANCEUR)",
  REVERT_PATCHING: "Réversion des correctifs",
  SCANNING_FILES:
    "Vérification de l’intégrité des fichiers de jeu. Fichiers terminés {0}/{1}",
  DOWNLOADING_ENVIRONMENT: "Téléchargement des fichiers d'environnement",
  DOWNLOADING_ENVIRONMENT_SPEED:
    "Téléchargement des fichiers d'environnement ({0}/s)",
  EXTRACT_ENVIRONMENT: "Extraction de l'environnement",
  CONFIGURING_ENVIRONMENT: "Configuration de l'environnement",
  RESTART_TO_INSTALL: "Redémarrer le lanceur",
  PATH_INVALID: "Le chemin est invalide",
  PLEASE_SELECT_A_DIR: "Veuillez sélectionner un chemin",
  PATH_INVALID_ASCII_ONLY:
    "Assurez-vous que le chemin d’accès ne contient que des caractères ASCII.",
  PATH_INVALID_FORBIDDEN_DIR:
    'Veuillez choisir un chemin qui n’est pas dans "Bureau", "Téléchargements" ou "Documents"',
  NOT_SUPPORTED_YET: "Fonctionnalité non prise en charge",
  PLEASE_WAIT_FOR_LAUNCHER_UPDATE:
    "Le lanceur ne prend pas en charge la version {0} actuellement. Veuillez attendre les mises à jour.",
  UNSUPPORTED_VERSION: "Version non prise en charge",
  SELECT_INSTALLATION_DIR:
    "Veuillez sélectionner le répertoire d’installation du jeu.\nSi vous avez déjà installé le jeu, sélectionnez l’emplacement du fichier exécutable du jeu.",
  CANT_OPEN_GAME_FILE: "Échec d’accès aux fichiers de jeu.",
  CANT_OPEN_GAME_FILE_DESC:
    "Le lanceur n’a pas pu accéder aux fichiers du jeu.\nVeuillez ajuster le répertoire d’installation du jeu après ce message.\n\nSi ce message apparaît plusieurs fois, veuillez vous assurer que le lanceur a l’autorisation d’accéder au répertoire du jeu.",
  GAME_DIR_CHANGED: "Le chemin d’accès au répertoire de jeu a changé.",
  GAME_DIR_CHANGED_DESC:
    "Vous avez modifié le chemin d’accès de votre jeu. Cette opération n’est pas prise en charge, mais vous pouvez modifier cela plus tard.",

  NEW_VERSION_AVALIABLE: "Une nouvelle mise à jour est disponible",
  NEW_VERSION_AVALIABLE_DESC:
    "Voulez-vous mettre à jour le lanceur vers la version {0}?\n Changements:\n{1}",

  DOWNLOADING_UPDATE_FILE: "Téléchargement des fichiers de mise à jour",

  UPGRADE_FUNCTION_TBD: "Actuellement, la mise à jour n’est pas mise en œuvre.",

  DECOMPRESS_FILE_PROGRESS: "Décompression des fichiers",
  ALLOCATING_FILE: "Allocation des fichiers sur le disque",
  DOWNLOADING_FILE_PROGRESS: "Téléchargement du fichier: {0} ({2}/{3}) {1}/s",

  BACKUP_USER_DATA: "Sauvegarde des données utilisateur",
  RECOVER_BACKUP_USER_DATA: "Récupération de la sauvegarde",

  INSTALL_DONE: "Terminée",

  RELAUNCH_REQUIRED: "Redémarrage du lanceur requis",
  RELAUNCH_REQUIRED_DESC:
    "Le lanceur redémarre pour terminer l’installation de wine.",

  SETTING: "Paramètres",
  SETTING_WINE_VERSION: "Distribution de Wine",
  SETTING_ASYNC_DXVK: "Compilation de shaders asynchrones DXVK",
  SETTING_ENABLED: "Activé",
  SETTING_DXVK_HUD: "HUD DXVK",
  SETTING_DXVK_HUD_NONE: "Aucun",
  SETTING_DXVK_HUD_FPS: "FPS Seulement",
  SETTING_DXVK_HUD_ALL: "Tout",
  SETTING_MTL_HUD: "HUD Metal",
  SETTING_RETINA: "Mode Retina",
  SETTING_LEFT_CMD: "Mapper CMD gauche à CTRL",
  SETTING_TURN_OFF_AC_PATCH: "Désactiver le patch AC",
  SETTING_SAVE: "Sauvegarder",
  SETTING_CANCEL: "Annuler",

  SETTING_CHECK_INTEGRITY: "Vérifier l'intégrité",
  SETTING_GAME_INSTALL_DIR: "Répertoire d’installation du jeu",
  // 0.0.27
  SETTING_WINE_VERSION_CONFIRM: "Cliquez ici pour confirmer la modification.",
  SETTING_QUICK_ACTIONS: "Actions rapides",
  SETTING_GENERAL: "Général",
  SETTING_GAME: "Jeu",
  LANGUAGE_LOCALE_NAME: "Français",
  SETTING_UI_LOCALE: "Langue de l’interface utilisateur du lanceur",
  SETTING_RESTART_TO_TAKE_EFFECT:
    "Cette action prendra effet après le redémarrage.",
  SETTING_OPEN_CMD: "Lancer l’outil de ligne de commande Wine",
  SETTING_OPEN_GAME_INSTALL_DIR: "Ouvrir le répertoire d’installation du jeu",
  SETTING_OPEN_YAAGL_DIR: "Ouvrir le répertoire de données de YAAGL",
  SETTING_YAAGL_VERSION: "Version de YAAGL",

  SETTING_WINE_CROSSOVER_ALERT:
    "Pour utiliser Crossover, il y a une étape manuelle supplémentaire. Cliquez ici pour en savoir plus.",

  SETTING_FPS_UNLOCK: "Déverrouiller la limite de FPS",
  SETTING_FPS_UNLOCK_DEFAULT: "Désactivée",

  SETTING_ADVANCED: "Avancé",
  SETTING_ADVANCED_ALERT:
    "NE CHANGEZ RIEN, à moins que vous sachiez ce que vous faites.",
  SETTING_ADVANCED_VISIBLE:
    "Les paramètres avancés sont maintenant disponibles.",

  NO_ENOUGH_DISKSPACE: "Pas assez d’espace libre sur le disque.",
  NO_ENOUGH_DISKSPACE_DESC:
    "Au moins {0}GiB ({1}GB) d’espace libre est nécessaire sur votre disque.",

  UPDATE: "Mettre à jour le jeu",
  GAME_VERSION_TOO_OLD_DESC:
    "Votre version actuelle du jeu ({0}) est trop ancienne pour être mise à jour progressivement. Veuillez réinstaller le jeu.",

  PREDOWNLOAD_READY: "Prétéléchargement {0}",

  COMMUNITY_WARNING: "Avertissement Communautaire",
  COMMUNITY_WINE_ALERT:
    "La sélection actuelle est la version communautaire, cette version n’est pas officiellement prise en charge, veuillez ne pas signaler de problèmes",

  SETTING_BLOCK_NET: "Launch Fix(block hosts)",
  SETTING_LICENSES: en.SETTING_LICENSES,
};

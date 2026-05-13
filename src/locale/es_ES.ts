import { en } from "./en";
import { zh_CN } from "./zh_CN";

export const es_ES: typeof zh_CN = {
  CONTENT_LANG_ID: "es-es",
  LAUNCH: "Iniciar el juego",
  INSTALL: "Instalar el juego",
  RESUME: "Continuar",
  REPAIR_GAME: "Reparar juego",
  UPDATING: "Actualizando",
  DOWNLOADING: "Descargando",
  FIXING_FILES: "Arreglando archivos del juego {0}/{1}",
  PATCHING: "Parchando archivos del juego",
  GAME_RUNNING: "El juego se está ejecutando (NO CIERRE LA APLICACIÓN)",
  REVERT_PATCHING: "Revirtiendo parches",
  SCANNING_FILES:
    "Verificando integridad de archivos. Archivos revisados {0}/{1}",
  DOWNLOADING_ENVIRONMENT: "Descargando archivos de entorno",
  DOWNLOADING_ENVIRONMENT_SPEED: "Descargando archivos de entorno ({0}/s)",
  EXTRACT_ENVIRONMENT: "Extrayendo entorno",
  CONFIGURING_ENVIRONMENT: "Configurando entorno",
  RESTART_TO_INSTALL: "Reinicie el programa",
  PATH_INVALID: "Ruta inválida",
  PLEASE_SELECT_A_DIR: "Por favor seleccione una ruta",
  PATH_INVALID_ASCII_ONLY:
    "Por favor cerciórese de que la ruta solo contenga caracteres ASCII",
  PATH_INVALID_FORBIDDEN_DIR:
    'Por favor seleccione una ruta que no esté dentro de "Escritorio", "Descargas" o "Documentos"',
  NOT_SUPPORTED_YET: "Función aún no soportada",
  PLEASE_WAIT_FOR_LAUNCHER_UPDATE:
    "La aplicación no soporta la versión {0} actualmente. Manténgase atento a una nueva actualización.",
  UNSUPPORTED_VERSION: "Versión no soportada",
  SELECT_INSTALLATION_DIR:
    "Por favor seleccione el directorio de instalación del juego.\nSi el juego ya está instalado, seleccione el directorio donde se ubica el ejecutable del juego",
  SELECT_INSTALLED_GAME_DIR: "Seleccionar juego instalado",
  LOADING_GAME: "Cargando {0}...",
  GAME_REGION_GLOBAL: "Global",
  GAME_REGION_CHINA: "China",
  CANT_OPEN_GAME_FILE: "No se pudo acceder a los archivos del juego",
  CANT_OPEN_GAME_FILE_DESC:
    "La aplicación no pudo acceder a los archivos del juego.\nNo se preocupe, aún puede seleccionar el directorio de instalación del juego después de cerrar el cuadro de diálogo.\n\nSi el mensaje aparece repetidamente, revise que la aplicación tenga los permisos adecuados para acceder al directorio de instalación del juego",
  GAME_DIR_CHANGED: "La ruta al directorio ha cambiado",
  GAME_DIR_CHANGED_DESC:
    "Parece que ha seleccionado una ruta que difiere de la escogida anteriormente. Esta operación es inválida, pero puede seleccionar nuevamente",

  NEW_VERSION_AVAILABLE: "Nueva versión disponible",
  NEW_VERSION_AVAILABLE_DESC:
    "Desea actualizar la aplicación a la versión {0}?\n Nuevos cambios:\n{1}",

  DOWNLOADING_UPDATE_FILE: "Descargando archivos de actualización",

  UPGRADE_FUNCTION_TBD:
    "La función de actualización no se encuentra implementada actualmente",

  DECOMPRESS_FILE_PROGRESS: "Descomprimiendo archivos",
  ALLOCATING_FILE: "Asignando archivos en disco",
  DOWNLOADING_FILE_PROGRESS: "Descargando archivo: {0} ({2}/{3}) {1}/s",

  BACKUP_USER_DATA: "Respaldando datos de usuario",
  RECOVER_BACKUP_USER_DATA: "Recuperando respaldo",

  INSTALL_DONE: "Listo",

  RELAUNCH_REQUIRED: "Reinicio requerido",
  RELAUNCH_REQUIRED_DESC:
    "La aplicación se reiniciará para procesar la instalación de Wine.",

  SETTING: "Ajustes",
  SETTING_WINE_VERSION: "Distribución de Wine",
  SETTING_ASYNC_DXVK: "Compilación Asincrónica de Shaders DXVK",
  SETTING_ENABLED: "Habilitado",
  SETTING_DXVK_HUD: "HUD DXVK",
  SETTING_DXVK_HUD_NONE: "Nada",
  SETTING_DXVK_HUD_FPS: "Solo FPS",
  SETTING_MTL_HUD: "Metal HUD",
  SETTING_DXVK_HUD_ALL: "Todo",
  SETTING_RETINA: "Modo Retina",
  SETTING_LEFT_CMD: "Asignar CMD izquierdo a CTRL",
  SETTING_TURN_OFF_AC_PATCH: "Apagar el AC parche",
  SETTING_CUSTOM_RESOLUTION: "Resolución personalizada",
  SETTING_SAVE: "Guardar",
  SETTING_CANCEL: "Cancelar",

  SETTING_CHECK_INTEGRITY: "Revisar Integridad",
  SETTING_GAME_INSTALL_DIR: "Directorio de Instalación del Juego",
  // 0.0.27
  SETTING_WINE_VERSION_CONFIRM: "Haz clic aquí para confirmar el cambio.",
  SETTING_QUICK_ACTIONS: "Acciones rápidas",
  SETTING_GENERAL: "General",
  SETTING_GAME: "Juego",
  LANGUAGE_LOCALE_NAME: "Español",
  SETTING_UI_LOCALE: "Idioma de la interfaz",
  SETTING_CHOOSE_OPTION: "Elige una opción",
  SETTING_RESTART_TO_TAKE_EFFECT: "Esto surtirá efecto después del reinicio.",
  SETTING_OPEN_CMD: "Abrir herramienta de línea de comandos de Wine",
  SETTING_OPEN_GAME_INSTALL_DIR: "Abrir directorio de instalación del juego",
  SETTING_OPEN_YAAGL_DIR: "Abrir directorio de datos de YAAGL",
  SETTING_YAAGL_VERSION: "Versión de YAAGL",

  SETTING_FPS_UNLOCK: "Desbloquear límite de FPS",
  SETTING_FPS_UNLOCK_DEFAULT: "Desactivado",

  SETTING_ADVANCED: "Avanzado",
  SETTING_ADVANCED_ALERT: "NO CAMBIE NADA a menos que sepa lo que está haciendo.",
  SETTING_ADVANCED_VISIBLE: "Los ajustes avanzados ya están disponibles.",

  NO_ENOUGH_DISKSPACE: "No hay suficiente espacio en disco.",
  NO_ENOUGH_DISKSPACE_DESC: "Se requiere al menos {0}GiB ({1}GB) de espacio libre en su disco.",

  UPDATE: "Actualizar juego",
  GAME_VERSION_TOO_OLD_DESC: "Tu versión actual del juego ({0}) es demasiado antigua para actualizarse gradualmente. Por favor, reinstala el juego.",

  PREDOWNLOAD_READY: "Pre-descarga {0}",

  COMMUNITY_WARNING: "Advertencia de la comunidad",
  COMMUNITY_WINE_ALERT: "La selección actual es la versión de la comunidad, esta versión no es compatible oficialmente, por favor no informe de ningún problema",

  SETTING_BLOCK_NET: "Arreglo de inicio (bloquear hosts)",
  SETTING_LICENSES: "Licencias",

  SETTING_ENABLE_HDR: "Activar HDR",

  SETTING_PROXY_ENABLED: "Activar Proxy HTTP",
  SETTING_PROXY_HOST: "Host del Proxy HTTP",
  SETTING_PROXY_DESC:
    "El proxy solo se aplica al juego, y no al launcher entero",

  SETTING_TURN_ON_STEAM_PATCH: "Activar Parche de Steam",

  UPDATE_PROMPT_IGNORE: "Ignorar actualización",
  SETTING_CHECK_UPDATE: "Buscar actualizaciones de YAAGL",
  ALREADY_LATEST_VERSION: "Ya estás utilizando la última versión.",
  UPDATE_LAUNCHER: "Actualizar Launcher",
};

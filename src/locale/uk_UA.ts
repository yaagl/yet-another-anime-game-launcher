import { zh_CN } from "./zh_CN";

export const uk_UA: typeof zh_CN = {
  CONTENT_LANG_ID: "uk-ua",
  LAUNCH: "Запустити гру",
  INSTALL: "Встановити гру",
  RESUME: "Продовжити",
  REPAIR_GAME: "Полагодити гру",
  REPAIR_AFTER_DOWNLOAD_DESC:
    "Гру ще не завантажено повністю. Спочатку продовжте завантаження; перевірка цілісності буде доступна після завершення встановлення.",
  UPDATING: "Оновлення",
  DOWNLOADING: "Завантаження",
  FIXING_FILES: "Виправлення ігрових файлів {0}/{1}",
  PATCHING: "Патчимо ігрові файли",
  GAME_RUNNING: "Гра запущена (НЕ ЗАКРИВАЙТЕ ЛАУНЧЕР)",
  REVERT_PATCHING: "Відкат патчів",
  SCANNING_FILES: "Перевірка цілісності файлів гри. Завершені файли {0}/{1}",
  DOWNLOADING_ENVIRONMENT: "Завантаження файлів оточення",
  DOWNLOADING_ENVIRONMENT_SPEED: "Завантаження файлів оточення ({0}/с)",
  EXTRACT_ENVIRONMENT: "Розпакування оточення",
  CONFIGURING_ENVIRONMENT: "Налаштування оточення",
  RESTART_TO_INSTALL: "Перезапустити програму",
  PATH_INVALID: "Невірний шлях",
  PLEASE_SELECT_A_DIR: "Будь ласка, виберіть шлях",
  PATH_INVALID_ASCII_ONLY: "Переконайтеся, що шлях містить лише символи ASCII.",
  PATH_INVALID_FORBIDDEN_DIR:
    'Будь ласка, виберіть шлях, який не знаходиться всередині "Стільниця", "Завантаження" або "Документи".',
  NOT_SUPPORTED_YET: "Функція ще не підтримується",
  PLEASE_WAIT_FOR_LAUNCHER_UPDATE:
    "На даний момент лаунчер не підтримує версію {0}. Будь ласка, зачекайте на оновлення.",
  UNSUPPORTED_VERSION: "Версія не підтримується",
  SELECT_INSTALLATION_DIR:
    "Будь ласка, виберіть каталог встановлення гри.\nЯкщо ви вже встановили гру, виберіть, де знаходиться виконуваний файл гри.",
  SELECT_INSTALLED_GAME_DIR: "Вибрати встановлену гру",
  LOADING_GAME: "Завантаження {0}...",
  GAME_REGION_GLOBAL: "Глобальна",
  GAME_REGION_CHINA: "Китай",
  CANT_OPEN_GAME_FILE: "Не вдалося отримати доступ до файлу гри",
  CANT_OPEN_GAME_FILE_DESC:
    "Лаунчеру не вдалося отримати доступ до файлів гри.\nВи зможете змінити каталог встановлення гри після закриття цього вікна.\n\nЯкщо це вікно з'являється повторно, будь ласка, переконайтеся, що лаунчер має права на доступ до каталогу гри.",
  GAME_DIR_CHANGED: "Шлях до каталогу гри змінено",
  GAME_DIR_CHANGED_DESC:
    "Ви змінили шлях до гри. Ця операція не підтримується, але ви зможете налаштувати це пізніше.",

  NEW_VERSION_AVAILABLE: "Доступне нове оновлення",
  NEW_VERSION_AVAILABLE_DESC:
    "Бажаєте оновити лаунчер до версії {0}?\n Зміни:\n{1}",

  DOWNLOADING_UPDATE_FILE: "Завантаження файлів оновлення",

  UPGRADE_FUNCTION_TBD: "На даний момент оновлення не реалізовано.",

  DECOMPRESS_FILE_PROGRESS: "Розпакування файлів",
  ALLOCATING_FILE: "Розподіл файлів на диску",
  DOWNLOADING_FILE_PROGRESS: "Завантаження файлу: {0} ({2}/{3}) {1}/с",

  BACKUP_USER_DATA: "Резервне копіювання даних користувача",
  RECOVER_BACKUP_USER_DATA: "Відновлення резервної копії",

  INSTALL_DONE: "Готово",

  RELAUNCH_REQUIRED: "Потрібен перезапуск лаунчера",
  RELAUNCH_REQUIRED_DESC:
    "Лаунчер буде перезапущено для завершення встановлення Wine.",

  SETTING: "Налаштування",
  SETTING_WINE_VERSION: "Дистрибутив Wine",
  SETTING_ASYNC_DXVK: "Асинхронна компіляція шейдерів DXVK",
  SETTING_ENABLED: "Увімкнено",
  SETTING_DXVK_HUD: "DXVK HUD",
  SETTING_DXVK_HUD_NONE: "Немає",
  SETTING_DXVK_HUD_FPS: "Тільки FPS",
  SETTING_DXVK_HUD_ALL: "Все",
  SETTING_MTL_HUD: "Metal HUD",
  SETTING_RETINA: "Режим Retina",
  SETTING_LEFT_CMD: "Прив'язати лівий CMD до CTRL",
  SETTING_TURN_OFF_AC_PATCH: "Вимкнути патч AC",
  SETTING_CUSTOM_RESOLUTION: "Власна роздільна здатність",
  SETTING_SAVE: "Зберегти",
  SETTING_CANCEL: "Скасувати",

  SETTING_CHECK_INTEGRITY: "Перевірити цілісність",
  SETTING_GAME_INSTALL_DIR: "Каталог встановлення гри",
  SETTING_WINE_VERSION_CONFIRM: "Натисніть тут для підтвердження змін.",
  SETTING_QUICK_ACTIONS: "Швидкі дії",
  SETTING_GENERAL: "Загальні",
  SETTING_GAME: "Гра",
  LANGUAGE_LOCALE_NAME: "Українська",
  SETTING_UI_LOCALE: "Мова інтерфейсу лаунчера",
  SETTING_CHOOSE_OPTION: "Оберіть варіант",
  SETTING_RESTART_TO_TAKE_EFFECT: "Зміни набудуть чинності після перезапуску.",
  SETTING_OPEN_CMD: "Запустити командний рядок Wine",
  SETTING_OPEN_GAME_INSTALL_DIR: "Відкрити каталог встановлення гри",
  SETTING_OPEN_YAAGL_DIR: "Відкрити каталог даних YAAGL",
  SETTING_YAAGL_VERSION: "Версія YAAGL",

  SETTING_FPS_UNLOCK: "Розблокувати ліміт FPS",
  SETTING_FPS_UNLOCK_DEFAULT: "Вимкнено",

  SETTING_ADVANCED: "Розширені",
  SETTING_ADVANCED_ALERT:
    "НІЧОГО НЕ ЗМІНЮЙТЕ, якщо не впевнені у своїх діях.",
  SETTING_ADVANCED_VISIBLE: "Розширені налаштування тепер доступні.",

  NO_ENOUGH_DISKSPACE: "Недостатньо вільного місця на диску.",
  NO_ENOUGH_DISKSPACE_DESC:
    "Для встановлення потрібно принаймні {0}ГіБ ({1}ГБ) вільного місця на диску.",

  UPDATE: "Оновити гру",
  GAME_VERSION_TOO_OLD_DESC:
    "Ваша поточна версія гри ({0}) занадто стара для покрокового оновлення. Будь ласка, перевстановіть гру.",

  PREDOWNLOAD_READY: "Попереднє завантаження {0}",

  COMMUNITY_WARNING: "Попередження спільноти",
  COMMUNITY_WINE_ALERT:
    "Наразі обрано версію від спільноти. Ця версія не підтримується офіційно, будь ласка, не повідомляйте про проблеми.",

  SETTING_BLOCK_NET: "Виправлення запуску (блокування хостів)",
  SETTING_LICENSES: "Ліцензії",
  SETTING_ENABLE_HDR: "Увімкнути HDR",

  SETTING_PROXY_ENABLED: "Увімкнути HTTP проксі",
  SETTING_PROXY_HOST: "Хост HTTP проксі",
  SETTING_PROXY_DESC:
    "Проксі застосовується лише до гри, а не до всього лаунчера.",

  SETTING_TURN_ON_STEAM_PATCH: "Увімкнути Steam патч",

  UPDATE_PROMPT_IGNORE: "Ігнорувати оновлення",
  SETTING_CHECK_UPDATE: "Перевірити наявність оновлень YAAGL",
  ALREADY_LATEST_VERSION: "Ви вже використовуєте останню версію.",
  UPDATE_LAUNCHER: "Оновити лаунчер",
};

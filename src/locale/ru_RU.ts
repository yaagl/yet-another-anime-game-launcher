import { en } from "./en";
import { zh_CN } from "./zh_CN";

export const ru_RU: typeof zh_CN = {
  CONTENT_LANG_ID: "ru-ru",
  LAUNCH: "Запустить игру",
  INSTALL: "Установить игру",
  UPDATING: "Обновление",
  DOWNLOADING: "Загрузка",
  FIXING_FILES: "Исправляем игровые файлы {0}/{1}",
  PATCHING: "Патчим игровые файлы",
  GAME_RUNNING: "Игра запущена (НЕ ЗАКРЫВАЙТЕ ЛАУНЧЕР)",
  REVERT_PATCHING: "Откат патчей",
  SCANNING_FILES: "Проверка целостности файлов игры. Завершенные файлы {0}/{1}",
  DOWNLOADING_ENVIRONMENT: "Загрузка файлов окружения",
  DOWNLOADING_ENVIRONMENT_SPEED: "Загрузка файлов окружения ({0}/s)",
  EXTRACT_ENVIRONMENT: "Распаковка окружения",
  CONFIGURING_ENVIRONMENT: "Настройка окружения",
  RESTART_TO_INSTALL: "Перезарустить программу",
  PATH_INVALID: "Неверный путь",
  PLEASE_SELECT_A_DIR: "Пожалуйста, выберите путь",
  PATH_INVALID_ASCII_ONLY: "Убедитесь, что путь содержит только символы ASCII.",
  PATH_INVALID_FORBIDDEN_DIR:
    'Пожалуйста, выберите путь, который не находится внутри "Рабочий стол", "Загрузки" или "Документы".',
  NOT_SUPPORTED_YET: "Функция еще не поддерживается",
  PLEASE_WAIT_FOR_LAUNCHER_UPDATE:
    "В настоящее время лаунчер не поддерживает версию {0}, дождитесь обновлений",
  UNSUPPORTED_VERSION: "Не поддерживаемая версия",
  SELECT_INSTALLATION_DIR:
    "Пожалуйста, выберите каталог установки игры.\nЕсли вы уже установили игру, выберите, где находится исполняемый файл игры.",
  CANT_OPEN_GAME_FILE: "Не удалось получить доступ к файлу игры",
  CANT_OPEN_GAME_FILE_DESC:
    "Лаунчеру не удалось получить доступ к файлу игры.\nНо не волнуйтесь, вы можете снова выбрать каталог установки игры, когда это диалоговое окно закроется\n\nЕсли это диалоговое окно появляется повторно, пожалуйста, проверьте, имеет ли программа запуска правильные разрешения для доступа к каталогу установки игры",
  GAME_DIR_CHANGED: "Путь к каталогу изменен",
  GAME_DIR_CHANGED_DESC:
    "Похоже, вы выбрали другой путь, который отличается от ранее выбранного. Эта операция недопустима, но вы можете выбрать ее позже",

  NEW_VERSION_AVALIABLE: "Доступна новая версия",
  NEW_VERSION_AVALIABLE_DESC:
    "Хотите ли вы обновить лаунчер до версии {0}?\n Что обновлено:\n{1}",

  DOWNLOADING_UPDATE_FILE: "Загрузка файлов обновлений",

  UPGRADE_FUNCTION_TBD: "В настоящее время обновление не реализовано",

  DECOMPRESS_FILE_PROGRESS: "Распаковка файлов",
  ALLOCATING_FILE: "Распределение файлов на диске",
  DOWNLOADING_FILE_PROGRESS: "Загрузка файла: {0} ({2}/{3}) {1}/s",

  BACKUP_USER_DATA: "Резервное копирование пользовательских данных",
  RECOVER_BACKUP_USER_DATA: "Восстановление резервной копии",

  INSTALL_DONE: "Готово",

  RELAUNCH_REQUIRED: "Требуется повторный запуск",
  RELAUNCH_REQUIRED_DESC:
    "Программа запуска перезагрузится, чтобы выполнить установку Wine.",

  SETTING: "Настройки",
  SETTING_WINE_VERSION: "Дистрибутив Wine",
  SETTING_ASYNC_DXVK: "Асинхронная компиляция шейдера DXVK",
  SETTING_ENABLED: "Включено",
  SETTING_DXVK_HUD: "Оверлэй DXVK",
  SETTING_DXVK_HUD_NONE: "Ничего",
  SETTING_DXVK_HUD_FPS: "Только FPS",
  SETTING_MTL_HUD: "Оверлэй Metal",
  SETTING_DXVK_HUD_ALL: "Всё",
  SETTING_RETINA: "Режим Retina",
  SETTING_LEFT_CMD: "Сопоставить левый CMD с CTRL",
  SETTING_TURN_OFF_AC_PATCH: "выключи патч AC",
  SETTING_SAVE: "Сохранить",
  SETTING_CANCEL: "Отменить",

  SETTING_CHECK_INTEGRITY: "Проверить целостность",
  SETTING_GAME_INSTALL_DIR: "Каталог установки игры",
  // 0.0.27
  SETTING_WINE_VERSION_CONFIRM: "Нажми на меня, чтобы подтвердить изменение",
  SETTING_QUICK_ACTIONS: "Быстрые действия",
  SETTING_GENERAL: "Основные",
  SETTING_GAME: "Игра",
  LANGUAGE_LOCALE_NAME: "Русский",
  SETTING_UI_LOCALE: "Язык лаунчера",
  SETTING_RESTART_TO_TAKE_EFFECT: "Это вступит в силу после перезагрузки.",
  SETTING_OPEN_CMD: "Открыть командную строку Wine",
  SETTING_OPEN_GAME_INSTALL_DIR: "Открыть каталог установки игры",
  SETTING_OPEN_YAAGL_DIR: "Откройте каталог данных YAAGL",
  SETTING_YAAGL_VERSION: "Версия YAAGL",

  SETTING_WINE_CROSSOVER_ALERT:
    "Чтобы использовать CrossOver, существует дополнительный шаг, который необходимо выполнить вручную. Нажмите на это поле, чтобы ознакомиться с подробностями.",

  SETTING_FPS_UNLOCK: "Разблокируйте FPS лимит",
  SETTING_FPS_UNLOCK_DEFAULT: "Выключено",

  SETTING_ADVANCED: "Дополнительные",
  SETTING_ADVANCED_ALERT:
    "НИЧЕГО НЕ МЕНЯЙТЕ, если только вы не знаете, что делаете.",
  SETTING_ADVANCED_VISIBLE: "Теперь видны расширенные настройки.",

  NO_ENOUGH_DISKSPACE: "Недостаточно свободного места на диске",
  NO_ENOUGH_DISKSPACE_DESC:
    "Требуется не менее {0}ГиБ ({1}Гб) свободного пространства.",

  UPDATE: "Обновите игру",
  GAME_VERSION_TOO_OLD_DESC:
    "Текущая версия игры ({0}) слишком устарела для постепенного обновления. Пожалуйста, переустановите игру.",

  PREDOWNLOAD_READY: "Предзагрузка {0}",

  COMMUNITY_WARNING: "Предупреждение сообщества",
  COMMUNITY_WINE_ALERT:
    "В настоящее время выбрана версия сообщества, эта версия официально не поддерживается, не сообщайте о каких - либо проблемах",

  SETTING_BLOCK_NET: "Launch Fix(block hosts)",
  SETTING_LICENSES: en.SETTING_LICENSES,
};

import { SuppportedContentLangId } from "./supported-content-lang-id";

export const zh_CN = {
  CONTENT_LANG_ID: "zh-cn" as SuppportedContentLangId,
  LAUNCH: "开始游戏",
  INSTALL: "安装游戏",
  UPDATING: "正在更新",
  DOWNLOADING: "正在下载",
  FIXING_FILES: "正在修复第{0}个文件，共{1}个",
  PATCHING: "正在应用补丁",
  GAME_RUNNING: "游戏正在运行中（请勿关闭启动器）",
  REVERT_PATCHING: "正在还原补丁",
  SCANNING_FILES: "确认游戏文件完整性中。正在扫描第{0}个文件，共{1}个",
  DOWNLOADING_ENVIRONMENT: "正在下载配置环境所需文件",
  DOWNLOADING_ENVIRONMENT_SPEED:
    "正在下载配置环境所需文件（当前速度: 每秒{0}）",
  EXTRACT_ENVIRONMENT: "正在解压配置环境所需文件",
  CONFIGURING_ENVIRONMENT: "正在配置环境",
  RESTART_TO_INSTALL: "重启以完成更新",
  PATH_INVALID: "路径无效",
  PLEASE_SELECT_A_DIR: "请选择一个路径",
  PATH_INVALID_ASCII_ONLY: "请选择只包含ASCII字符（英文+半角符号）的路径",
  PATH_INVALID_FORBIDDEN_DIR:
    "请选择不存在于「桌面」「文档」或「下载」目录之下的路径",
  NOT_SUPPORTED_YET: "尚未支持",
  PLEASE_WAIT_FOR_LAUNCHER_UPDATE:
    "当前启动器还不支持启动{0}版本。请等待后续更新。",
  UNSUPPORTED_VERSION: "不支持的版本",
  SELECT_INSTALLATION_DIR:
    "选择游戏的安装目录。\n如果你已安装游戏，请选择游戏.exe文件所在的位置",
  CANT_OPEN_GAME_FILE: "无法读取游戏文件",
  CANT_OPEN_GAME_FILE_DESC:
    '启动器无法打开游戏文件。\n但不用着急，此对话框关闭后你可以再次手动选择游戏安装目录。\n\n如果此对话框反复出现，请检查启动器是否具有足够的权限访问游戏目录（macOS部分文件夹，如"下载"，需要特殊的权限设置）。',
  GAME_DIR_CHANGED: "路径不一致",
  GAME_DIR_CHANGED_DESC:
    "似乎跟你上次设置的游戏目录不一致。本操作无效，但之后你仍可以重新设置。",
  NEW_VERSION_AVALIABLE: "启动器有新版本可用",
  NEW_VERSION_AVALIABLE_DESC: "你希望更新到最新{0}版本吗?\n更新内容:\n{1}",
  DOWNLOADING_UPDATE_FILE: "正在下载更新文件",

  // FIXME
  UPGRADE_FUNCTION_TBD: "启动器尚未实装升级功能。",

  DECOMPRESS_FILE_PROGRESS: "正在解压文件",
  ALLOCATING_FILE: "正在分配磁盘空间",
  DOWNLOADING_FILE_PROGRESS: "正在下载游戏文件：{0} ({2}/{3}) 速度：每秒{1}",

  BACKUP_USER_DATA: "正在备份用户数据",
  RECOVER_BACKUP_USER_DATA: "正在还原备份用户数据",

  INSTALL_DONE: "安装成功",

  RELAUNCH_REQUIRED: "启动器需要重启",
  RELAUNCH_REQUIRED_DESC: "需要重启以更新wine版本",

  SETTING: "设置",
  SETTING_WINE_VERSION: "Wine 版本",
  SETTING_ASYNC_DXVK: "DXVK Shader异步编译",
  SETTING_ENABLED: "启用",
  SETTING_DXVK_HUD: "DXVK HUD",
  SETTING_DXVK_HUD_NONE: "不显示",
  SETTING_DXVK_HUD_FPS: "显示FPS",
  SETTING_DXVK_HUD_ALL: "显示所有信息",
  SETTING_MTL_HUD: "Metal HUD",
  SETTING_RETINA: "Retina 模式",
  SETTING_LEFT_CMD: "映射左 CMD 键为 CTRL 键",
  SETTING_TURN_OFF_AC_PATCH: "关闭AC补丁",
  SETTING_SAVE: "保存",
  SETTING_CANCEL: "取消",

  SETTING_GAME_INSTALL_DIR: "游戏安装路径",
  SETTING_CHECK_INTEGRITY: "检查文件完整性",

  SETTING_WINE_VERSION_CONFIRM: "点击确认修改",
  SETTING_QUICK_ACTIONS: "快速操作",
  SETTING_GENERAL: "通用",
  SETTING_GAME: "游戏",
  LANGUAGE_LOCALE_NAME: "简体中文",
  SETTING_UI_LOCALE: "启动器界面语言",
  SETTING_RESTART_TO_TAKE_EFFECT: "此设置将从下次启动生效",
  SETTING_OPEN_CMD: "打开Wine命令行工具",
  SETTING_OPEN_GAME_INSTALL_DIR: "打开游戏安装目录",
  SETTING_OPEN_YAAGL_DIR: "打开YAAGL数据目录",
  SETTING_YAAGL_VERSION: "YAAGL版本",

  SETTING_WINE_CROSSOVER_ALERT:
    "如果使用CrossOver，则有一个步骤必须由你手动完成。点击这个提示以获取详情。",

  SETTING_FPS_UNLOCK: "帧率限制解锁",
  SETTING_FPS_UNLOCK_DEFAULT: "不解锁",

  SETTING_ADVANCED: "高级设置",
  SETTING_ADVANCED_ALERT: "在不清楚作用的情况下，请不要改动任何设置。",
  SETTING_ADVANCED_VISIBLE: "高级设置已解锁。",

  NO_ENOUGH_DISKSPACE: "磁盘空间不足",
  NO_ENOUGH_DISKSPACE_DESC: "解压安装需要至少{0}GiB ({1}GB)的剩余空间",

  UPDATE: "更新游戏",
  GAME_VERSION_TOO_OLD_DESC:
    "当前游戏版本({0})太过久远，无法增量更新。请重新安装游戏。",

  PREDOWNLOAD_READY: "预载{0}版本",

  COMMUNITY_WARNING: "社区版警告",
  COMMUNITY_WINE_ALERT:
    "当前选择为社区版本，此版本不受官方支持，请不要报告任何问题",

  SETTING_BLOCK_NET: "Launch Fix(block hosts)",
  SETTING_LICENSES: "Licenses",
};

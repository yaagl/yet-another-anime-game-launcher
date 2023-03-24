import { en } from "./en";
import { zh_CN } from "./zh_CN";

export const vi_VN: typeof zh_CN = {
  CONTENT_LANG_ID: "vi-vn",
  LAUNCH: "Chạy Game",
  INSTALL: "Cài đặt Game",
  UPDATING: "Đang cập nhật",
  DOWNLOADING: "Đang tải",
  FIXING_FILES: "Đang sửa game files {0}/{1}",
  PATCHING: "Patching game files",
  GAME_RUNNING: "Game đang chạy (VUI LÒNG KHÔNG ĐÓNG LAUNCHER)",
  REVERT_PATCHING: "Đang gỡ patch",
  SCANNING_FILES: "Kiểm tra tính hoàn thành của file. Files được kiểm tra {0}/{1}",
  DOWNLOADING_ENVIRONMENT: "Đang tải environment files",
  DOWNLOADING_ENVIRONMENT_SPEED: "Đang tải environment files ({0}/s)",
  EXTRACT_ENVIRONMENT: "Đang giải nén environment",
  CONFIGURING_ENVIRONMENT: "Đang tuỳ chỉnh environment",
  RESTART_TO_INSTALL: "Khởi động lại chương trình",
  PATH_INVALID: "Đường dẫn không hợp lệ",
  PLEASE_SELECT_A_DIR: "Vui lòng chọn đường dẫn",
  PATH_INVALID_ASCII_ONLY: "Hãy chắc chắn rằng đường dẫn chỉ bao gồm ký tự ASCII",
  PATH_INVALID_FORBIDDEN_DIR: 'Vui lòng hãy chọn đường dẫn mà nó không phải "Desktop","Downloads" hoặc "Documents"',
  NOT_SUPPORTED_YET: "Chức năng chưa được hỗ trợ",
  PLEASE_WAIT_FOR_LAUNCHER_UPDATE: "Launcher hiện tại vẫn chưa hỗ trợ phiên bản {0}, hãy chờ bản cập nhật cho nó",
  UNSUPPORTED_VERSION: "Phiên bản không được hỗ trợ",
  SELECT_INSTALLATION_DIR: "Vui lòng chọn thư mục cài đặt game.\nNếu như bạn đã có sẵn game thì hãy chọn thư mục có chứa tệp thực thi (.exe) của game",
  CANT_OPEN_GAME_FILE: "Không truy cập được game file ",
  CANT_OPEN_GAME_FILE_DESC: "Launcher không truy cập được game file\nNhưng đừng lo, bạn có thể chọn lại thư mục cài đặt game khi mà cái bảng này được đóng\n\nNếu như bảng này cứ hiện lên lặp lại liên tục, hãy kiểm tra liệu launcher có được cấp đúng quyền để truy cập thư mục cài đặt game hay chưa",
  GAME_DIR_CHANGED: "Đường dẫn tới thư mục đã được thay đổi",
  GAME_DIR_CHANGED_DESC: "Có vẻ như bạn đã chọn một thư mục khác với cái được chọn trước đó. Tiến trình này không hợp lệ, nhưng bạn có thể chọn lại sau",

  NEW_VERSION_AVALIABLE: "Phiên bản mới khả dụng",
  NEW_VERSION_AVALIABLE_DESC: "Bạn có muốn cập nhật launcher lên phiên bản {0} không?\n Những thứ được cập nhật:\n{1}",

  DOWNLOADING_UPDATE_FILE: "Đang tải file cập nhật",

  UPGRADE_FUNCTION_TBD: "Hiện tại upgrade chưa được tích hợp",

  DECOMPRESS_FILE_PROGRESS:"Đang xả nén files",
  ALLOCATING_FILE: "Sắp xếp files trên ổ",
  DOWNLOADING_FILE_PROGRESS:"Đang tải file: {0} ({2}/{3}) {1}/s",

  BACKUP_USER_DATA: "Đang sau lưu dữ liệu người dùng",
  RECOVER_BACKUP_USER_DATA: "Đang khôi phục sao lưu",

  INSTALL_DONE: "Hoàn tất",

  RELAUNCH_REQUIRED: "Yêu cầu khởi động lại",
  RELAUNCH_REQUIRED_DESC: "Launcher sẽ khởi động lại để tiến hành quá trình cài đặt wine.",

  SETTING: "Cài đặt",
  SETTING_WINE_VERSION: "Phiên bản phân phối Wine",
  SETTING_ASYNC_DXVK: "DXVK Asynchronous Shader Compiling",
  SETTING_ENABLED: "Bật",
  SETTING_DXVK_HUD: "DXVK HUD",
  SETTING_DXVK_HUD_NONE: "Không",
  SETTING_DXVK_HUD_FPS: "Chỉ hiện FPS",
  SETTING_DXVK_HUD_ALL: "Hiện tất cả thông tin",
  SETTING_RETINA: "Chế độ Retina",
  SETTING_SAVE: "Lưu",
  SETTING_CANCEL: "Huỷ",

  SETTING_CHECK_INTEGRITY: "Kiểm tra tính toàn vẹn file",
  SETTING_GAME_INSTALL_DIR: "Thư Mục Cài Đặt Game",
  // 0.0.27
  SETTING_WINE_VERSION_CONFIRM: en.SETTING_WINE_VERSION_CONFIRM,
  SETTING_QUICK_ACTIONS: en.SETTING_QUICK_ACTIONS,
  SETTING_GENERAL: en.SETTING_GENERAL,
  LANGUAGE_LOCALE_NAME: "Tiếng Việt",
  SETTING_UI_LOCALE: en.SETTING_UI_LOCALE,
  SETTING_RESTART_TO_TAKE_EFFECT: en.SETTING_RESTART_TO_TAKE_EFFECT,
};

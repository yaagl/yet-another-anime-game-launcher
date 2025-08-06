import { en } from "./en";
import { zh_CN } from "./zh_CN";

export const vi_VN: typeof zh_CN = {
  CONTENT_LANG_ID: "vi-vn",
  LAUNCH: "Khởi động trò chơi",
  INSTALL: "Cài đặt trò chơi",
  UPDATING: "Đang cập nhật",
  DOWNLOADING: "Đang tải",
  FIXING_FILES: "Đang sửa tệp trò chơi {0}/{1}",
  PATCHING: "Đang vá tệp trò chơi",
  GAME_RUNNING: "Đang chạy trò choi (VUI LÒNG KHÔNG ĐÓNG TRÌNH KHỞI ĐỘNG)",
  REVERT_PATCHING: "Đang hoàn tác bản vá",
  SCANNING_FILES:
    "Kiểm tra tính toàn vẹn của tệp. {0}/{1} tệp đã được hoàn thành ",
  DOWNLOADING_ENVIRONMENT: "Đang tải tệp môi trường",
  DOWNLOADING_ENVIRONMENT_SPEED: "Đang tải xuống tệp môi trường ({0}/s)",
  EXTRACT_ENVIRONMENT: "Đang giải nén môi trường",
  CONFIGURING_ENVIRONMENT: "Đang tuỳ chỉnh môi trường",
  RESTART_TO_INSTALL: "Khởi động lại chương trình",
  PATH_INVALID: "Đường dẫn không hợp lệ",
  PLEASE_SELECT_A_DIR: "Vui lòng chọn đường dẫn",
  PATH_INVALID_ASCII_ONLY:
    "Hãy chắc chắn rằng đường dẫn chỉ bao gồm ký tự ASCII",
  PATH_INVALID_FORBIDDEN_DIR:
    'Vui lòng hãy chọn đường dẫn khác ngoài "Desktop","Downloads" hoặc "Documents"',
  NOT_SUPPORTED_YET: "Chức năng chưa được hỗ trợ",
  PLEASE_WAIT_FOR_LAUNCHER_UPDATE:
    "Trình khởi động hiện tại vẫn chưa hỗ trợ phiên bản {0}, xin vui lòng hãy đợi bản cập nhật mới",
  UNSUPPORTED_VERSION: "Phiên bản không được hỗ trợ",
  SELECT_INSTALLATION_DIR:
    "Vui lòng chọn thư mục cài đặt trò chơi.\nNếu như bạn đã có sẵn game thì hãy chọn thư mục có chứa tệp thực thi (.exe) của game",
  CANT_OPEN_GAME_FILE: "Không truy cập được tệp của trò chơi",
  CANT_OPEN_GAME_FILE_DESC:
    "Trình khởi động không truy cập được tệp trò chơi\nNhưng đừng lo, bạn có thể chọn lại thư mục cài đặt trò chơi khi bảng này được đóng\n\nNếu như bảng này vẫn lặp lại liên tục, hãy kiểm tra liệu trình khởi động có được cấp quyền để truy cập thư mục cài đặt trò chơi này không",
  GAME_DIR_CHANGED: "Đường dẫn thư mục đã được thay đổi",
  GAME_DIR_CHANGED_DESC:
    "Dường như như bạn đã chọn một thư mục khác với thư mục đã được chọn trước đó. Tiến trình không hợp lệ, nhưng bạn có thể chọn lại sau",

  NEW_VERSION_AVALIABLE: "Phiên bản mới khả dụng",
  NEW_VERSION_AVALIABLE_DESC:
    "Bạn có muốn cập nhật trình khởi động lên phiên bản {0} không?\n Những thứ được cập nhật:\n{1}",

  DOWNLOADING_UPDATE_FILE: "Đang tải tệp cập nhật",

  UPGRADE_FUNCTION_TBD: "Hiện tại nâng cấp vẫn chưa được tích hợp",

  DECOMPRESS_FILE_PROGRESS: "Đang giải nén tệp",
  ALLOCATING_FILE: "Đang phân bổ tệp trên ổ đĩa",
  DOWNLOADING_FILE_PROGRESS: "Đang tải tệp: {0} ({2}/{3}) {1}/s",

  BACKUP_USER_DATA: "Đang sao lưu dữ liệu người dùng",
  RECOVER_BACKUP_USER_DATA: "Đang khôi phục sao lưu",

  INSTALL_DONE: "Hoàn tất",

  RELAUNCH_REQUIRED: "Yêu cầu khởi động lại",
  RELAUNCH_REQUIRED_DESC:
    "Trình khởi động sẽ khởi động lại để tiến hành quá trình cài đặt wine.",

  SETTING: "Cài đặt",
  SETTING_WINE_VERSION: "Phiên bản Wine",
  SETTING_ASYNC_DXVK: "DXVK Asynchronous Shader Compiling",
  SETTING_ENABLED: "Bật",
  SETTING_DXVK_HUD: "DXVK HUD",
  SETTING_DXVK_HUD_NONE: "Không",
  SETTING_DXVK_HUD_FPS: "Chỉ hiện FPS",
  SETTING_DXVK_HUD_ALL: "Hiện tất cả thông tin",
  SETTING_MTL_HUD: "Metal HUD",
  SETTING_RETINA: "Chế độ Retina",
  SETTING_LEFT_CMD: "Ánh xạ CMD trái sang CTRL",
  SETTING_TURN_OFF_AC_PATCH: "tắt bản vá AC",
  SETTING_SAVE: "Lưu",
  SETTING_CANCEL: "Huỷ",

  SETTING_CHECK_INTEGRITY: "Kiểm tra tính toàn vẹn của tệp",
  SETTING_GAME_INSTALL_DIR: "Thư mục cài đặt trò chơi",
  // 0.0.27
  SETTING_WINE_VERSION_CONFIRM: "Ấn vào để xác nhận thay đổi",
  SETTING_QUICK_ACTIONS: "Cài đặt nhanh",
  SETTING_GENERAL: "Cài đặt chung",
  SETTING_GAME: "Trò chơi",
  LANGUAGE_LOCALE_NAME: "Tiếng Việt",
  SETTING_UI_LOCALE: "Ngôn ngữ trình khởi động",
  SETTING_RESTART_TO_TAKE_EFFECT:
    "Cài đặt sẽ có hiệu lực sau khi khởi động lại",
  SETTING_OPEN_CMD: "Mở command line (cmd) của wine",
  SETTING_OPEN_GAME_INSTALL_DIR: "Mở thư mục cài đặt trò chơi",
  SETTING_OPEN_YAAGL_DIR: "Mở thư mục dữ liệu của YAAGL",
  SETTING_YAAGL_VERSION: "Phiên bản YAAGL",

  SETTING_WINE_CROSSOVER_ALERT:
    "Để sử dụng CrossOver, một vài bước cần phải được tuỳ chỉnh thủ công. Nhấn vào đây để biết thêm chi tiết",

  SETTING_FPS_UNLOCK: "Mở khoá giới hạn FPSUnlock FPS Limit",
  SETTING_FPS_UNLOCK_DEFAULT: "Tắt",

  SETTING_ADVANCED: "Nâng cao",
  SETTING_ADVANCED_ALERT:
    "VUI LÒNG KHÔNG THAY ĐỔI BẤT KỲ ĐIỀU GÌ, trừ khi bạn biết mình nên làm gì.",
  SETTING_ADVANCED_VISIBLE: "Cài đặt nâng cao hiện có thể nhìn thấy.",

  NO_ENOUGH_DISKSPACE: "Không đủ dung lượng trống trên ổ đĩa",
  NO_ENOUGH_DISKSPACE_DESC: "Cần có tối thiếu {0}GiB ({1}GB) dung lượng trống.",

  UPDATE: en.UPDATE,
  GAME_VERSION_TOO_OLD_DESC: en.GAME_VERSION_TOO_OLD_DESC,

  PREDOWNLOAD_READY: en.PREDOWNLOAD_READY,

  COMMUNITY_WARNING: "Cảnh báo phiên bản cộng đồng",
  COMMUNITY_WINE_ALERT:
    "Hiện tại được chọn là phiên bản cộng đồng, phiên bản này không được hỗ trợ chính thức, vui lòng không báo cáo bất kỳ vấn đề nào",

  SETTING_BLOCK_NET: "Launch Fix(block hosts)",
  SETTING_LICENSES: en.SETTING_LICENSES,
};

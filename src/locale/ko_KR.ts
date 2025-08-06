import { zh_CN } from "./zh_CN";
import { en } from "@locale/en";

export const ko_KR: typeof zh_CN = {
  CONTENT_LANG_ID: "ko-kr",
  LAUNCH: "게임 실행",
  INSTALL: "게임 다운로드",
  UPDATING: "업데이트 중",
  DOWNLOADING: "다운로드 중",
  FIXING_FILES: "게임 파일 복구 중 {0}/{1}",
  PATCHING: "게임 파일 패치 중",
  GAME_RUNNING: "게임이 실행 중입니다 (절대로 런처를 닫지 마세요)",
  REVERT_PATCHING: "패치 되돌리는 중",
  SCANNING_FILES: "게임 파일 무결성 확인 중. {0}/{1}개 완료됨",
  DOWNLOADING_ENVIRONMENT: "실행 환경 다운로드 중",
  DOWNLOADING_ENVIRONMENT_SPEED: "실행 환경 다운로드 중 ({0}/s)",
  EXTRACT_ENVIRONMENT: "실행 환경 압축 해제 중",
  CONFIGURING_ENVIRONMENT: "실행 환경 구성 중",
  RESTART_TO_INSTALL: "프로그램 재시작",
  PATH_INVALID: "경로가 유효하지 않습니다",
  PLEASE_SELECT_A_DIR: "경로를 선택해 주세요",
  PATH_INVALID_ASCII_ONLY: "경로에 ASCII 문자열만 포함되어 있는지 확인하세요",
  PATH_INVALID_FORBIDDEN_DIR:
    '"데스크탑", "다운로드" 또는 "문서" 폴더 내의 경로는 지정할 수 없습니다',
  NOT_SUPPORTED_YET: "지원되지 않는 기능입니다",
  PLEASE_WAIT_FOR_LAUNCHER_UPDATE:
    "런처는 현재 {0}버전을 지원하지 않습니다. 추가 업데이트를 기다려 주세요",
  UNSUPPORTED_VERSION: "지원되지 않는 버전입니다",
  SELECT_INSTALLATION_DIR:
    "게임 설치 경로를 선택하세요.\n이미 게임을 설치했다면, 게임 실행 파일의 위치를 선택하세요.",
  CANT_OPEN_GAME_FILE: "게임 파일에 접근할 수 없습니다",
  CANT_OPEN_GAME_FILE_DESC:
    "런처가 게임 파일에 접근할 수 없습니다.\n하지만 걱정하지 마세요. 이 대화상자가 닫힐 때 게임 설치 경로를 다시 지정할 수 있습니다.\n\n이 대화상자가 반복적으로 나타나면 런처가 게임 설치 경로에 접근할 수 있는 권한이 있는지 확인하십시오",
  GAME_DIR_CHANGED: "게임 설치 경로가 변경되었습니다.",
  GAME_DIR_CHANGED_DESC:
    "이전에 선택한 것과 다른 경로를 선택한 것 같습니다. 이 작업은 유효하지 않지만, 나중에 다시 선택할 수 있습니다.",

  NEW_VERSION_AVALIABLE: "새로운 업데이트 사용 가능",
  NEW_VERSION_AVALIABLE_DESC:
    "런처를 {0}버전으로 업데이트하시겠습니까? N 업데이트 내역:\n{1}",

  DOWNLOADING_UPDATE_FILE: "업데이트 파일 다운로드 중",

  UPGRADE_FUNCTION_TBD: "업데이트가 없습니다",

  DECOMPRESS_FILE_PROGRESS: "파일 압축 해제하는 중",
  ALLOCATING_FILE: "디스크에 파일 할당하는 중",
  DOWNLOADING_FILE_PROGRESS: "파일 다운로드 중: {0} ({2}/{3}) {1}/s",

  BACKUP_USER_DATA: "사용자 데이터 백업",
  RECOVER_BACKUP_USER_DATA: "사용자 데이터 복원",

  INSTALL_DONE: "완료되었습니다",

  RELAUNCH_REQUIRED: "재실행 필요",
  RELAUNCH_REQUIRED_DESC:
    "Wine 설치를 완료하기 위해서 런처의 재실행이 필요합니다",

  SETTING: "설정",
  SETTING_WINE_VERSION: "Wine 버전",
  SETTING_ASYNC_DXVK: "DXVK 비동기 셰이더 컴파일",
  SETTING_ENABLED: "활성화",
  SETTING_DXVK_HUD: "DXVK HUD",
  SETTING_DXVK_HUD_NONE: "없음",
  SETTING_DXVK_HUD_FPS: "FPS만",
  SETTING_DXVK_HUD_ALL: "모든 정보 보기",
  SETTING_MTL_HUD: "Metal HUD",
  SETTING_RETINA: "Retina 모드",
  SETTING_LEFT_CMD: "왼쪽 CMD를 CTRL로 할당",
  SETTING_TURN_OFF_AC_PATCH: "AC 패치 비활성화",
  SETTING_SAVE: "저장",
  SETTING_CANCEL: "취소",

  SETTING_CHECK_INTEGRITY: "게임 파일 무결성 검사",
  SETTING_GAME_INSTALL_DIR: "게임 설치 경로",
  // 0.0.27
  SETTING_WINE_VERSION_CONFIRM: "변경 사항을 확인하려면 이곳을 클릭하세요.",
  SETTING_QUICK_ACTIONS: "빠른 작업",
  SETTING_GENERAL: "일반",
  SETTING_GAME: "게임",
  LANGUAGE_LOCALE_NAME: "한국어",
  SETTING_UI_LOCALE: "런처 UI 언어",
  SETTING_RESTART_TO_TAKE_EFFECT:
    "이 설정은 런처를 재시작한 이후에 적용됩니다.",
  SETTING_OPEN_CMD: "Wine 명령줄 도구 실행",
  SETTING_OPEN_GAME_INSTALL_DIR: "게임 설치 경로 열기",
  SETTING_OPEN_YAAGL_DIR: " YAAGL 데이터 경로 열기",
  SETTING_YAAGL_VERSION: "YAAGL 버전",

  SETTING_WINE_CROSSOVER_ALERT:
    "Crossover를 사용하려면, 수동으로 수행해야 하는 추가 작업이 있습니다. 자세한 내용을 보려면 이 버튼을 클릭하세요.",

  SETTING_FPS_UNLOCK: "FPS 제한 해제",
  SETTING_FPS_UNLOCK_DEFAULT: "비활성화",

  SETTING_ADVANCED: "고급",
  SETTING_ADVANCED_ALERT:
    "당신이 무엇을 하고 있는지 모른다면, 아무것도 바꾸지 마세요.",
  SETTING_ADVANCED_VISIBLE: "이제 고급 설정이 활성화 되었습니다.",

  NO_ENOUGH_DISKSPACE: "디스크에 여유 공간이 부족합니다",
  NO_ENOUGH_DISKSPACE_DESC:
    "디스크에 최소 {0}GiB ({1}GB)의 여유 공간이 필요합니다.",

  UPDATE: "게임 업데이트",
  GAME_VERSION_TOO_OLD_DESC:
    "현재 게임 버전({0})은 점진적으로 업데이트하기에는 너무 오래되었습니다. 게임을 다시 설치해 주세요",

  PREDOWNLOAD_READY: "사전 다운로드 {0}",

  COMMUNITY_WARNING: "커뮤니티 버전 경고",
  COMMUNITY_WINE_ALERT:
    "현재 커뮤니티 버전이 선택되었습니다.이 버전은 공식적으로 지원되지 않습니다. 보고하지 마십시오",

  SETTING_BLOCK_NET: "게임실행 문제해결(hosts 수정)",
  SETTING_LICENSES: en.SETTING_LICENSES,
};

import { zh_CN } from "./zh_CN";

export const th_TH: typeof zh_CN = {
  CONTENT_LANG_ID: "th-th",
  LAUNCH: "เริ่มเกม",
  INSTALL: "ติดตั้งเกม",
  UPDATING: "กำลังอัปเดต",
  DOWNLOADING: "กำลังดาวน์โหลด",
  FIXING_FILES: "กำลังซ่อมแซมไฟล์เกม {0}/{1}",
  PATCHING: "กำลังแก้ไขไฟล์เกม",
  GAME_RUNNING: "เกมกำลังทำงาน (ห้ามปิดลันเชอร์เด็ดขาด)",
  REVERT_PATCHING: "กำลังย้อนคืนแพตช์",
  SCANNING_FILES: "กำลังตรวจสอบความสมบูรณ์ของไฟล์เกม, สำเร็จไปแล้ว {0}/{1}",
  DOWNLOADING_ENVIRONMENT: "กำลังดาวน์โหลดไฟล์ระบบ",
  DOWNLOADING_ENVIRONMENT_SPEED: "กำลังดาวน์โหลดไฟล์ระบบ ({0}/s)",
  EXTRACT_ENVIRONMENT: "กำลังแตกไฟล์ระบบ",
  CONFIGURING_ENVIRONMENT: "กำลังตั้งค่าไฟล์ระบบ",
  RESTART_TO_INSTALL: "รีสตาร์ทโปรแกรม",
  PATH_INVALID: "ตำแหน่งไฟล์ไม่ถูกต้อง",
  PLEASE_SELECT_A_DIR: "กรุณาเลือกตำแหน่งไฟล์",
  PATH_INVALID_ASCII_ONLY: "กรุณาเลือกตำแหน่งไฟล์ที่มีตัวอักษร ASCII เท่านั้น",
  PATH_INVALID_FORBIDDEN_DIR:
    'กรุณาเลือกตำแหน่งไฟล์ที่ไม่ได้อยู่ใน "Desktop", "Downloads" หรือ "Documents"',
  NOT_SUPPORTED_YET: "ยังไม่รองรับ",
  PLEASE_WAIT_FOR_LAUNCHER_UPDATE:
    "ขณะนี้ลันเชอร์ยังไม่รองรับเวอร์ชัน {0} โปรดรอการอัปเดตเพิ่มเติม",
  UNSUPPORTED_VERSION: "เวอร์ชันไม่รองรับ",
  SELECT_INSTALLATION_DIR:
    "กรุณาเลือกไดเรกทอรีสำหรับติดตั้งเกม\nหากคุณติดตั้งเกมเรียบร้อยแล้ว, ให้เลือกตำแหน่งของไฟล์ที่ใช้สำหรับรันเกม",
  CANT_OPEN_GAME_FILE: "ไม่สามารถเข้าถึงไฟล์เกมได้",
  CANT_OPEN_GAME_FILE_DESC:
    "ลันเชอร์ไม่สามารถเข้าถึงไฟล์เกมได้\nกรุณาปรับเปลี่ยนไดเรกทอรีติดตั้งเกมหลังจากนี้\n\nหากข้อความนี้ปรากฏขึ้นซ้ำๆ, โปรดตรวจสอบให้แน่ใจว่าลันเชอร์ได้รับสิทธิ์ในการเข้าถึงไดเรกทอรีของเกม",
  GAME_DIR_CHANGED: "ตำแหน่งไปยังไดเรกทอรีเกมมีการเปลี่ยนแปลง",
  GAME_DIR_CHANGED_DESC:
    "ตรวจพบการเปลี่ยนแปลงตำแหน่งของเกม โปรดระบุตำแหน่งใหม่ในการตั้งค่าเพื่อให้ทำงานได้อย่างถูกต้อง",

  NEW_VERSION_AVALIABLE: "มีการอัปเดตเวอร์ชันใหม่",
  NEW_VERSION_AVALIABLE_DESC:
    "ต้องการอัปเดตเป็นเวอร์ชัน {0} หรือไม่?\n\nเปลี่ยนแปลง:\n{1}",

  DOWNLOADING_UPDATE_FILE: "กำลังดาวน์โหลดไฟล์อัปเดต",

  UPGRADE_FUNCTION_TBD: "ฟังก์ชันอัปเดตยังไม่พร้อมใช้งานในขณะนี้",

  DECOMPRESS_FILE_PROGRESS: "กำลังแตกไฟล์",
  ALLOCATING_FILE: "กำลังจัดสรรพื้นที่ไฟล์บนดิสก์",
  DOWNLOADING_FILE_PROGRESS: "กำลังดาวน์โหลดไฟล์: {0} ({2}/{3}) {1}/s",

  BACKUP_USER_DATA: "กำลังสำรองข้อมูลผู้ใช้",
  RECOVER_BACKUP_USER_DATA: "กำลังกู้คืนข้อมูลสำรอง",

  INSTALL_DONE: "เสร็จสิ้น",

  RELAUNCH_REQUIRED: "ต้องรีสตาร์ทโปรแกรม",
  RELAUNCH_REQUIRED_DESC:
    "ลันเชอร์จะทำการรีสตาร์ทเพื่อดำเนินการติดตั้ง wine ให้เสร็จสมบูรณ์",

  SETTING: "ตั้งค่า",
  SETTING_WINE_VERSION: "Wine Distribution",
  SETTING_ASYNC_DXVK: "DXVK Asynchronous Shader Compiling",
  SETTING_ENABLED: "เปิดใช้งาน",
  SETTING_DXVK_HUD: "DXVK HUD",
  SETTING_DXVK_HUD_NONE: "ไม่แสดง",
  SETTING_DXVK_HUD_FPS: "แสดงเฉพาะ FPS",
  SETTING_DXVK_HUD_ALL: "แสดงทั้งหมด",
  SETTING_MTL_HUD: "Metal HUD",
  SETTING_RETINA: "โหมด Retina",
  SETTING_LEFT_CMD: "แมปปุ่ม CMD ซ้ายเป็น CTRL",
  SETTING_TURN_OFF_AC_PATCH: "ปิดการใช้งานแพตช์ AC",
  SETTING_SAVE: "บันทึก",
  SETTING_CANCEL: "ยกเลิก",

  SETTING_CHECK_INTEGRITY: "ตรวจสอบความสมบูรณ์ของไฟล์",
  SETTING_GAME_INSTALL_DIR: "ไดเรกทอรีติดตั้งเกม",
  // 0.0.27
  SETTING_WINE_VERSION_CONFIRM: "ยืนยัน",
  SETTING_QUICK_ACTIONS: "Quick Actions",
  SETTING_GENERAL: "ทั่วไป",
  SETTING_GAME: "เกม",
  LANGUAGE_LOCALE_NAME: "ไทย",
  SETTING_UI_LOCALE: "ภาษาของลันเชอร์",
  SETTING_RESTART_TO_TAKE_EFFECT: "การตั้งค่านี้จะมีผลหลังจากรีสตาร์ท",
  SETTING_OPEN_CMD: "เปิด Wine Command Line Tool",
  SETTING_OPEN_GAME_INSTALL_DIR: "เปิดไดเรกทอรีติดตั้งเกม",
  SETTING_OPEN_YAAGL_DIR: "เปิดไดเรกทอรีข้อมูล YAAGL",
  SETTING_YAAGL_VERSION: "เวอร์ชัน YAAGL",

  SETTING_WINE_CROSSOVER_ALERT:
    "ในการใช้ Crossover มีขั้นตอนที่ต้องทำด้วยตนเองเพิ่มเติม คลิกที่นี่เพื่อเรียนรู้เพิ่มเติม",

  SETTING_FPS_UNLOCK: "ปลดล็อกจำกัด FPS",
  SETTING_FPS_UNLOCK_DEFAULT: "ปิดใช้งาน",

  SETTING_ADVANCED: "ขั้นสูง",
  SETTING_ADVANCED_ALERT:
    "อย่าเปลี่ยนแปลงอะไรเด็ดขาด, เว้นแต่คุณจะรู้ว่ากำลังทำอะไรอยู่",
  SETTING_ADVANCED_VISIBLE: "การตั้งค่าขั้นสูงพร้อมใช้งานแล้ว",

  NO_ENOUGH_DISKSPACE: "มีพื้นที่บนดิสก์ไม่เพียงพอ",
  NO_ENOUGH_DISKSPACE_DESC: "ต้องการพื้นที่ว่างบนดิสก์อย่างน้อย {0}GiB ({1}GB)",

  UPDATE: "อัปเดตเกม",
  GAME_VERSION_TOO_OLD_DESC:
    "เนื่องจากเวอร์ชันเกม ({0}) เก่าเกินไป จึงไม่สามารถอัปเดตแพตช์ได้ กรุณาติดตั้งเกมใหม่ทั้งหมด",

  PREDOWNLOAD_READY: "ดาวน์โหลดล่วงหน้า {0}",

  COMMUNITY_WARNING: "คำเตือนจากชุมชน",
  COMMUNITY_WINE_ALERT:
    "เวอร์ชันที่เลือกคือเวอร์ชันจากชุมชน ซึ่งไม่ได้รับการสนับสนุนอย่างเป็นทางการ กรุณาอย่ารายงานปัญหาใดๆ มา",

  SETTING_BLOCK_NET: "Launch Fix(block hosts)",
};

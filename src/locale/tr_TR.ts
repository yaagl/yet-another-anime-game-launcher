import { zh_CN } from "./zh_CN";

export const tr_TR: typeof zh_CN = {
  CONTENT_LANG_ID: "tr_tr",
  LAUNCH: "Oyunu Başlat",
  INSTALL: "Oyunu Yükle",
  UPDATING: "Güncelleniyor",
  DOWNLOADING: "İndiriliyor",
  FIXING_FILES: "Oyun dosyaları düzeltiliyor {0}/{1}",
  PATCHING: "Oyun dosyaları yamalanıyor",
  GAME_RUNNING: "Oyun çalıştırılıyor (LÜTFEN BAŞLATICIYI KAPATMAYIN)",
  REVERT_PATCHING: "Yamalar geri alınıyor",
  SCANNING_FILES: "Oyun dosyalarının bütünlüğü kontrol ediliyor. Tamamlanan dosyalar {0}/{1}",
  DOWNLOADING_ENVIRONMENT: "Ortam dosyaları indiriliyor",
  DOWNLOADING_ENVIRONMENT_SPEED: "Ortam dosyaları indiriliyor ({0}/s)",
  EXTRACT_ENVIRONMENT: "Ortam çıkartılıyor",
  CONFIGURING_ENVIRONMENT: "Ortam ayarlanıyor",
  RESTART_TO_INSTALL: "Programı yeniden başlat",
  PATH_INVALID: "Geçersiz yol",
  PLEASE_SELECT_A_DIR: "Lütfen yol seç",
  PATH_INVALID_ASCII_ONLY:
    "Lütfen yolun sadece ASCII karakterlerini içerdiğinden emin olun",
  PATH_INVALID_FORBIDDEN_DIR:
    'Lütfen yolu seçerken "Masaüstü", "İndirilenler" veya "Belgeler" klasörü içinde seçmeyin.',
  NOT_SUPPORTED_YET: "Özellik henüz desteklenmiyor",
  PLEASE_WAIT_FOR_LAUNCHER_UPDATE:
    "Başlatıcı şuanda {0} sürümünü desteklemiyor. Lütfen yeni güncellemeyi bekleyin.",
  UNSUPPORTED_VERSION: "Desteklenmeyen bir sürüm",
  SELECT_INSTALLATION_DIR:
    "Lütfen bir oyun yükleme dizini seçin.\nEğer zaten yüklü bir oyununuz varsa çalıştırılabilir dosyanın konumunu seçin.",
  CANT_OPEN_GAME_FILE: "Oyun dosyalarını erişilirken hata oluştu",
  CANT_OPEN_GAME_FILE_DESC:
    "Başlatıcı, oyun dosyasına erişemedi.\nAncak endişelenmeyin, bu iletişim kutusu kapandığında oyun kurulum dizinini tekrar seçebilirsiniz.\n\nBu iletişim kutusu tekrar tekrar görüntülenirse, lütfen başlatıcının oyun kurulum dizinine erişmek için doğru izinlere sahip olup olmadığını kontrol edin.",
  GAME_DIR_CHANGED: "Dizine giden yol değişti",
  GAME_DIR_CHANGED_DESC:
    "Daha önce seçilenden farklı bir yol seçmişsiniz gibi görünüyor. Bu işlem geçersiz, ancak daha sonra yeniden seçebilirsiniz",

  NEW_VERSION_AVALIABLE: "Yeni Güncelleme Var",
  NEW_VERSION_AVALIABLE_DESC:
    "Başlatıcıyı {0} verisyonuna güncellemek istiyor musun?\n Neler Güncellendi?:\n{1}",

  DOWNLOADING_UPDATE_FILE: "Güncelleme dosyaları indiriliyor.",

  UPGRADE_FUNCTION_TBD: "Şu anda güncelleme uygulanmadı",

  DECOMPRESS_FILE_PROGRESS: "Dosyalar çıkartılıyor",
  ALLOCATING_FILE: "Diskte yer alan dosyalar",
  DOWNLOADING_FILE_PROGRESS: "Dosya indiriliyor: {0} ({2}/{3}) {1}/s",

  BACKUP_USER_DATA: "Kullanıcı verisi yedekleniyor",
  RECOVER_BACKUP_USER_DATA: "Yedeğe geri dönülüyor",

  INSTALL_DONE: "Bitti",

  RELAUNCH_REQUIRED: "Yeniden başlatma gerekiyor",
  RELAUNCH_REQUIRED_DESC:
    "Başlatıcı, Wine kurulumunu işlemek için yeniden başlayacak.",

  SETTING: "Ayarlar",
  SETTING_WINE_VERSION: "Wine Dağıtımı",
  SETTING_ASYNC_DXVK: "DXVK Asenkron Gölgelendirici Derlemesi",
  SETTING_ENABLED: "Aktif",
  SETTING_DXVK_HUD: "DXVK HUD",
  SETTING_DXVK_HUD_NONE: "Hiçbiri",
  SETTING_DXVK_HUD_FPS: "Sadece FPS",
  SETTING_DXVK_HUD_ALL: "Tümü",
  SETTING_RETINA: "Retina Modu",
  SETTING_LEFT_CMD: "Sol CMD'yi CTRL'ye ata",
  SETTING_SAVE: "Keydet",
  SETTING_CANCEL: "İptal",

  SETTING_CHECK_INTEGRITY: "Bütünlüğü Kontrol Et",
  SETTING_GAME_INSTALL_DIR: "Oyun Kuurulum Dizini",
  // 0.0.27
  SETTING_WINE_VERSION_CONFIRM: "Değişiklikleri onaylamak için bana tıkla.",
  SETTING_QUICK_ACTIONS: "Hızlı Aksiyonlar",
  SETTING_GENERAL: "Genel",
  LANGUAGE_LOCALE_NAME: "Türkçe",
  SETTING_UI_LOCALE: "Başlatıcı Arayüz Dili",
  SETTING_RESTART_TO_TAKE_EFFECT: "Bir sonraki başlatmada etkili olacaktır.",
  SETTING_OPEN_CMD: "Wine Komut Satırı Aracını Başlat",
  SETTING_OPEN_GAME_INSTALL_DIR: "Oyun Kurulum Dizinini Aç",
  SETTING_OPEN_YAAGL_DIR: "Yaagl Data Dizinini Aç",

  SETTING_WINE_CROSSOVER_ALERT:
    "Crossover kullanmak için, manuel olarak ekstra bir adım daha yapılmalıdır. Kutuya tıklayarak daha fazla detay öğren.",

  SETTING_FPS_UNLOCK: "FPS Limitinin Kilidini Aç",
  SETTING_FPS_UNLOCK_DEFAULT: "Devre dışı",

  SETTING_ADVANCED: "Gelişmiş",
  SETTING_ADVANCED_ALERT:
    "Ne yaptığınızı bilmiyorsanız, HİÇBİR ŞEYİ DEĞİŞTİRMEYİN.",
  SETTING_ADVANCED_VISIBLE: "Gelişmiş ayarlar şuanda görünür.",

  NO_ENOUGH_DISKSPACE: "Diskinizde yeterli boş alan yok.",
  NO_ENOUGH_DISKSPACE_DESC:
    "Diskinizde en az {0}GiB ({1}GB) boş yer bulunması gereklidir.",

  UPDATE: "Oyunu Güncelle",
  GAME_VERSION_TOO_OLD_DESC:
    "Mevcut oyun sürümü ({0}) aşamalı olarak güncellenemeyecek kadar eski. Lütfen oyunu yeniden yükleyin.",

  PREDOWNLOAD_READY: "Erken İndir {0}",
};

import { zh_CN } from "./zh_CN";

export const en: typeof zh_CN = {
  CONTENT_LANG_ID: "pt-br",
  LAUNCH: "Iniciar o jogo",
  INSTALL: "Instalar o jogo",
  UPDATING: "Atualizando",
  DOWNLOADING: "Baixando",
  FIXING_FILES: "Verificar arquivos do jogo {0}/{1}",
  PATCHING: "Atualizando arquivos do jogo",
  GAME_RUNNING: "O jogo está sendo executado (NÃO FECHE O LAUNCHER)",
  REVERT_PATCHING: "Revertendo os patches",
  SCANNING_FILES: "Checando a integridade dos arquivos do jogo. Completos {0}/{1}",
  DOWNLOADING_ENVIRONMENT: "Baixando arquivos de ambiente",
  DOWNLOADING_ENVIRONMENT_SPEED: "Baixando arquivos de ambiente ({0}/s)",
  EXTRACT_ENVIRONMENT: "Extraindo arquivos de ambiente",
  CONFIGURING_ENVIRONMENT: "Configurando ambiente",
  RESTART_TO_INSTALL: "Reiniciando o programa",
  PATH_INVALID: "Caminho inválido",
  PLEASE_SELECT_A_DIR: "Selecione o diretório",
  PATH_INVALID_ASCII_ONLY:
    "Certifique-se que o diretório contenha apenas caracteres ASCII",
  PATH_INVALID_FORBIDDEN_DIR:
    'Selectione um caminho que não seja dentro de "Desktop", "Downloads" ou "Documentos"',
  NOT_SUPPORTED_YET: "Implementação não suportada",
  PLEASE_WAIT_FOR_LAUNCHER_UPDATE:
    "O launcher atualmente não suporta a versão {0}, aguarde novas atualizações",
  UNSUPPORTED_VERSION: "Não suportado nesta versão",
  SELECT_INSTALLATION_DIR:
    "Selectione caminho dos arquivos do jogo.\nSe você já possui o jogo instalado, selecione onde o executável do jogo está.",
  CANT_OPEN_GAME_FILE: "Falha ao acessar arquivos do jogo",
  CANT_OPEN_GAME_FILE_DESC:
    "Launcher falhou ao acessar arquivos do jogo.\nMas não se preocupe, você pode selecionar o caminho novamente quando esta caixa de diálogo fechar\n\nSe este problema se repetir, verifique se o launcher possui as permissões de acesso a diretório onde o jogo está instalado",
  GAME_DIR_CHANGED: "O caminho do diretório foi modificado",
  GAME_DIR_CHANGED_DESC:
    "Parece que você selecionou um caminho diferente do selecionado anteriormente. Esta operação é inválida, mas você pode selecionar novamente mais tarde",

  NEW_VERSION_AVALIABLE: "Nova atualização disponível",
  NEW_VERSION_AVALIABLE_DESC:
    "Você gostaria de atualizar o launcher para a versão {0}?\n O que foi atualizado:\n{1}",

  DOWNLOADING_UPDATE_FILE: "Baixando arquivos de atualização",

  UPGRADE_FUNCTION_TBD: "Atual operação de atualizacão não implementada",

  DECOMPRESS_FILE_PROGRESS: "Descompactando arquivos",
  ALLOCATING_FILE: "Alocando arquivos no disco",
  DOWNLOADING_FILE_PROGRESS: "Baixando arquivo: {0} ({2}/{3}) {1}/s",

  BACKUP_USER_DATA: "Efetuando backup de dados do usuário",
  RECOVER_BACKUP_USER_DATA: "Recuperando backup",

  INSTALL_DONE: "Completo",

  RELAUNCH_REQUIRED: "Reinicio do software necessário",
  RELAUNCH_REQUIRED_DESC:
    "O launcher irá reiniciar para processar a atualização do wine.",

  SETTING: "Configurações",
  SETTING_WINE_VERSION: "Distribuição Wine",
  SETTING_ASYNC_DXVK: "DXVK - Compilação de shader assíncrono",
  SETTING_ENABLED: "Ativado",
  SETTING_DXVK_HUD: "DXVK HUD",
  SETTING_DXVK_HUD_NONE: "Nenhum",
  SETTING_DXVK_HUD_FPS: "Apenas FPS",
  SETTING_DXVK_HUD_ALL: "Tudo",
  SETTING_MTL_HUD: "Metal HUD",
  SETTING_RETINA: "Modo Retina",
  SETTING_LEFT_CMD: "Mapear CMD da esquerda para CTRL",
  SETTING_TURN_OFF_AC_PATCH: "Desligar patch AC",
  SETTING_SAVE: "Salvar",
  SETTING_CANCEL: "Cancelar",

  SETTING_CHECK_INTEGRITY: "Checar Integridade",
  SETTING_GAME_INSTALL_DIR: "Diretório de instalação do jogo",
  // 0.0.27
  SETTING_WINE_VERSION_CONFIRM: "Clique aqui para confirmara a mudança",
  SETTING_QUICK_ACTIONS: "Ações rápidas",
  SETTING_GENERAL: "Geral",
  SETTING_GAME: "Jogo",
  LANGUAGE_LOCALE_NAME: "Português",
  SETTING_UI_LOCALE: "Idioma da interface",
  SETTING_RESTART_TO_TAKE_EFFECT: "Isto será acionado após reinício.",
  SETTING_OPEN_CMD: "Executar ferramenta de linha de comando do Wine",
  SETTING_OPEN_GAME_INSTALL_DIR: "Abrir diretório de instalação do jogo",
  SETTING_OPEN_YAAGL_DIR: "Abrir diretório do YAAGL",
  SETTING_YAAGL_VERSION: "Versão do YAAGL",

  SETTING_WINE_CROSSOVER_ALERT:
    "Para utilizar crossover, é necessário um passo adicional que precisa ser efetuado manualmente. Clique aqui para ver os detalhes.",

  SETTING_FPS_UNLOCK: "Desbloquear limite de FPS",
  SETTING_FPS_UNLOCK_DEFAULT: "Desligado",

  SETTING_ADVANCED: "Avançado",
  SETTING_ADVANCED_ALERT:
    "NÃO MODIFIQUE NADA, exceto que tenha certeza do que está fazendo.",
  SETTING_ADVANCED_VISIBLE: "Configurações avançadas estão visíveis agora.",

  NO_ENOUGH_DISKSPACE: "Não há espaço suficiente",
  NO_ENOUGH_DISKSPACE_DESC:
    "São necessários pelo menos {0}GiB ({1}GB) de espaço livre em disco.",

  UPDATE: "Atualizar o jogoß",
  GAME_VERSION_TOO_OLD_DESC:
    "Versão atual do jogo ({0}) é muito antiga para atualizar de forma incremental. Por favor, reinstale o jogo.",

  PREDOWNLOAD_READY: "Pre-download {0}",
};

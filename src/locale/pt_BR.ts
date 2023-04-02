import { zh_CN } from "./zh_CN";

export const pt_BR: typeof zh_CN = {
  CONTENT_LANG_ID: "pt-br",
  LAUNCH: "Iniciar o jogo",
  INSTALL: "Instalar o jogo",
  UPDATING: "Atualizando",
  DOWNLOADING: "Baixando",
  FIXING_FILES: "Consertando os arquivos do jogo {0}/{1}",
  PATCHING: "Atualizando arquivos do jogo",
  GAME_RUNNING: "O jogo está em execução (NÃO FECHE O LAUNCHER)",
  REVERT_PATCHING: "Revertendo atualizações",
  SCANNING_FILES:
    "Checando integridade dos arquivos do jogo. Arquivos concluídos {0}/{1}",
  DOWNLOADING_ENVIRONMENT: "Baixando arquivos de ambiente",
  DOWNLOADING_ENVIRONMENT_SPEED: "Baixando arquivos de ambiente ({0}/s)",
  EXTRACT_ENVIRONMENT: "Extraindo arquivos de ambiente",
  CONFIGURING_ENVIRONMENT: "Configurando arquivos de ambiente",
  RESTART_TO_INSTALL: "Reinicie o programa",
  PATH_INVALID: "O caminho é invalido",
  PLEASE_SELECT_A_DIR: "Por favor selecione um caminho",
  PATH_INVALID_ASCII_ONLY:
    "Por favor, verifique se o caminho contém apenas caracteres ASCII",
  PATH_INVALID_FORBIDDEN_DIR:
    'Por favor, escolha um caminho que não esteja dentro "Desktop","Downloads" ou "Documents"',
  NOT_SUPPORTED_YET: "Funcionalidade não suportada ainda",
  PLEASE_WAIT_FOR_LAUNCHER_UPDATE:
    "O launcher não suporta a versão {0} atualmente, por favor aguarde por atualizações",
  UNSUPPORTED_VERSION: "Versão não suportada",
  SELECT_INSTALLATION_DIR:
    "Por favor, selecione o diretório de instalação do jogo.\n Se você já instalou o jogo, selecione onde o arquivo executável do jogo está localizado",
  CANT_OPEN_GAME_FILE: "Falha ao acessar o arquivo do jogo",
  CANT_OPEN_GAME_FILE_DESC:
    "O launcher falhou ao acessar os arquivos do jogo.\nMas não se preocupe, você pode selecionar novamente o diretório de instalação do jogo quando esta janela for fechada\n\nSe esta janela aparecer repetidamente, verifique se o launcher tem permissão para acessar o diretório de instalação do jogo",
  GAME_DIR_CHANGED: "O caminho para o diretório mudou",
  GAME_DIR_CHANGED_DESC:
    "Parece que você selecionou outro caminho que é diferente do anteriormente selecionado. Essa operação é inválida, mas você pode selecionar novamente mais tarde",

  NEW_VERSION_AVALIABLE: "Nova versão disponível",
  NEW_VERSION_AVALIABLE_DESC:
    "Você gostaria de atualizar o launcher para a versão {0}?\n O que foi atualizado:\n{1}",

  DOWNLOADING_UPDATE_FILE: "Baixando arquivos de atualização",

  UPGRADE_FUNCTION_TBD: "Atualmente, a atualização não está implementada",

  DECOMPRESS_FILE_PROGRESS: "Descompactando arquivos",
  ALLOCATING_FILE: "Alocando arquivos no disco",
  DOWNLOADING_FILE_PROGRESS: "Baixando arquivo: {0} ({2}/{3}) {1}/s",

  BACKUP_USER_DATA: "Fazendo backup dos dados do usuário",
  RECOVER_BACKUP_USER_DATA: "Recuperando backup",

  INSTALL_DONE: "Concluído",

  RELAUNCH_REQUIRED: "É necessário reiniciar o programa",
  RELAUNCH_REQUIRED_DESC:
    "O launcher será reiniciado para processar a instalação do Wine.",

  SETTING: "Configurações",
  SETTING_WINE_VERSION: "Distribuição do Wine",
  SETTING_ASYNC_DXVK: "DXVK Asynchronous Shader Compiling",
  SETTING_ENABLED: "Habilitado",
  SETTING_DXVK_HUD: "DXVK HUD",
  SETTING_DXVK_HUD_NONE: "Nenhum",
  SETTING_DXVK_HUD_FPS: "FPS apenas",
  SETTING_DXVK_HUD_ALL: "Tudo",
  SETTING_RETINA: "Retina Mode",
  SETTING_SAVE: "Salvar",
  SETTING_CANCEL: "Cancelar",

  SETTING_CHECK_INTEGRITY: "Verificar Integridade",
  SETTING_GAME_INSTALL_DIR: "Diretório de Instalação do Jogo",
  // 0.0.27
  SETTING_WINE_VERSION_CONFIRM: "Clique em mim para confirmar a alteração",
  SETTING_QUICK_ACTIONS: "Ações rápidas",
  SETTING_GENERAL: "Geral",
  LANGUAGE_LOCALE_NAME: "Português (Brasil)",
  SETTING_UI_LOCALE: "Idioma da Interface do launcher",
  SETTING_RESTART_TO_TAKE_EFFECT:
    "A mudança terá efeito após a reinicialização.",
  SETTING_OPEN_CMD: "Abrir Ferramenta de Linha de Comando do Wine",
  SETTING_OPEN_GAME_INSTALL_DIR: "Abrir diretório de instalação do jogo",
  SETTING_OPEN_YAAGL_DIR: "Abrir diretório de dados do Yaagl",

  SETTING_WINE_CROSSOVER_ALERT:
    "Para usar o Crossover, há um passo adicional que deve ser feito manualmente. Clique nesta caixa para saber os detalhes",

  SETTING_FPS_UNLOCK: "Desbloquear Limite de FPS",
  SETTING_FPS_UNLOCK_DEFAULT: "Desabilitado",

  SETTING_ADVANCED: "Avançado",
  SETTING_ADVANCED_ALERT:
    "NÃO ALTERE NADA, a menos que você saiba o que está fazendo.",
  SETTING_ADVANCED_VISIBLE: "Configurações avançadas agora estão visíveis",
};

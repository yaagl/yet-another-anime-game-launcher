import { For, Show, createSignal, onMount, type JSXElement } from "solid-js";
import { Dynamic } from "solid-js/web";
import { createLauncher } from ".";
import { Aria2 } from "@aria2";
import { Locale } from "@locale";
import { Wine } from "@wine";
import { Github } from "../github";
import { fatal, getKeyOrDefault, setKey, setStorageNamespace } from "@utils";
import {
  GAME_GROUPS,
  GameDefinition,
  GameGroup,
  getGameById,
  getGroupById,
  type GameId,
  type LauncherFactory,
} from "../clients/registry";

export async function createGameDashboard({
  wine,
  locale,
  github,
  aria2,
  onCheckUpdate,
}: {
  wine: Wine;
  locale: Locale;
  github: Github;
  aria2: Aria2;
  onCheckUpdate: () => void;
}) {
  const launcherCache = new Map<GameId, LauncherFactory>();
  const initialGame = getGameById(
    await getKeyOrDefault("dashboard_last_selected_game", "hk4eos")
  );
  const initialGroup = getGroupById(initialGame.groupId);

  function variantLabel(game: GameDefinition) {
    return game.variantLabel == "China"
      ? locale.get("GAME_REGION_CHINA")
      : locale.get("GAME_REGION_GLOBAL");
  }

  async function createGameLauncher(game: GameDefinition) {
    const cached = launcherCache.get(game.id);
    if (cached) return cached;

    setStorageNamespace(game.id);
    const Launcher = await createLauncher({
      wine,
      locale,
      github,
      aria2,
      channelClient: await game.createClient({
        wine,
        aria2,
        locale,
      }),
      onCheckUpdate,
    });
    launcherCache.set(game.id, Launcher);
    return Launcher;
  }

  return function GameDashboard(): JSXElement {
    const [selectedGroup, setSelectedGroup] = createSignal(initialGroup);
    const [selectedGame, setSelectedGame] = createSignal(initialGame);
    const [launcherState, setLauncherState] =
      createSignal<{ component: LauncherFactory }>();
    const [loadingGameId, setLoadingGameId] = createSignal<GameId>();

    async function selectGame(game: GameDefinition) {
      if (
        selectedGame().id == game.id &&
        launcherState() != null &&
        loadingGameId() == null
      ) {
        return;
      }
      if (loadingGameId()) return;
      setLoadingGameId(game.id);
      try {
        setStorageNamespace(game.id);
        const NextLauncher = await createGameLauncher(game);
        const group = getGroupById(game.groupId);
        setSelectedGroup(group);
        setSelectedGame(game);
        setLauncherState({ component: NextLauncher });
        await setKey("dashboard_last_selected_game", game.id);
        await setKey(`dashboard_${group.id}_selected_variant`, game.id);
      } finally {
        setLoadingGameId(undefined);
      }
    }

    onMount(() => {
      selectGame(initialGame).catch(fatal);
    });

    async function selectGroup(group: GameGroup) {
      if (selectedGroup().id == group.id || loadingGameId()) return;
      const savedVariant = await getKeyOrDefault(
        `dashboard_${group.id}_selected_variant`,
        ""
      );
      const game =
        group.variants.find(variant => variant.id == savedVariant) ??
        group.variants[0];
      await selectGame(game);
    }

    return (
      <>
        <Show
          when={launcherState()}
          fallback={
            <div class="dashboard-loading">
              <div>
                {locale.format("LOADING_GAME", [selectedGame().title])}
              </div>
            </div>
          }
        >
          {state => <Dynamic component={state().component} />}
        </Show>
        <div class="game-variant-switcher">
          <span>{selectedGroup().title}</span>
          <div>
            <For each={selectedGroup().variants}>
              {game => (
                <button
                  classList={{
                    selected: selectedGame().id == game.id,
                    loading: loadingGameId() == game.id,
                  }}
                  disabled={Boolean(loadingGameId())}
                  onClick={() => selectGame(game).catch(fatal)}
                >
                  {variantLabel(game)}
                </button>
              )}
            </For>
          </div>
        </div>
        <aside class="game-sidebar">
          <For each={GAME_GROUPS}>
            {group => (
              <button
                classList={{
                  "game-sidebar-button": true,
                  selected: selectedGroup().id == group.id,
                  loading: group.variants.some(
                    variant => loadingGameId() == variant.id
                  ),
                }}
                title={group.title}
                onClick={() => selectGroup(group).catch(fatal)}
              >
                <img src={group.icon} alt={group.title} />
                <span>{group.shortTitle}</span>
              </button>
            )}
          </For>
        </aside>
        <Show when={loadingGameId()}>
          <div class="game-switch-loading">
            {locale.format("LOADING_GAME", [selectedGame().title])}
          </div>
        </Show>
      </>
    );
  };
}

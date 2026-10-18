import {
  Box,
  Button,
  FormControl,
  FormLabel,
  HStack,
  Input,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Text,
  VStack,
} from "@hope-ui/solid";
import {
  createResource,
  createSignal,
  createUniqueId,
  For,
  Show,
} from "solid-js";
import type { SophonGame } from "../sophon/game";
import type { InstallSelection } from "../sophon/install-options";
import { humanFileSize } from "../utils/helper";

export function InstallOptions(props: {
  game: SophonGame;
  verification: boolean;
  selectPath: () => Promise<string>;
  onClose: () => void;
  onConfirm: (selection: InstallSelection) => void;
}) {
  const id = createUniqueId();
  const [selectedMode, setSelectedMode] = createSignal<"full" | "base">("full");
  const [selectedVoices, setSelectedVoices] = createSignal<string[]>([]);
  const [choosingDirectory, setChoosingDirectory] = createSignal(false);
  const [directoryError, setDirectoryError] = createSignal("");
  const [options, { refetch }] = createResource(async () => {
    const [catalog] = await Promise.all([
      props.game.installOptions(),
      props.game.refresh(),
    ]);
    return catalog;
  });
  const catalog = () => (options.error ? undefined : options());
  const error = () =>
    directoryError() ||
    (options.error ? String(options.error) : props.game.error());
  const busy = () =>
    options.loading ||
    props.game.loading() ||
    props.game.operationRunning() ||
    choosingDirectory();
  const resuming = () =>
    !props.verification &&
    (props.game.action()?.action === "resumeInstall" ||
      (props.game.action()?.action === "resumeUpdate" &&
        !props.game.action()?.cacheOnly));
  const mode = () =>
    resuming()
      ? props.game.action()?.mode === "CATEGORY_SCENARIO_BASE"
        ? "base"
        : "full"
      : selectedMode();
  const existingVoices = () => props.game.action()?.voicePacks ?? [];
  const voicePacks = () => [
    ...new Set([...existingVoices(), ...selectedVoices()]),
  ];
  const totalSize = () => {
    const value = catalog();
    if (!value) return "—";
    const gameSize = value.modes.find(option => option.mode === mode())?.size;
    if (gameSize === undefined) return "—";
    return humanFileSize(
      gameSize +
        value.voicePacks
          .filter(pack => voicePacks().includes(pack.id))
          .reduce((total, pack) => total + pack.size, 0)
    );
  };

  async function chooseDirectory() {
    setChoosingDirectory(true);
    setDirectoryError("");
    try {
      const directory = await props.selectPath();
      if (directory && directory !== props.game.installDir()) {
        await props.game.selectDirectory(directory);
        setSelectedVoices([]);
      }
    } catch (error) {
      setDirectoryError(String(error));
    } finally {
      setChoosingDirectory(false);
    }
  }

  const optionStyle = {
    display: "flex",
    minW: 0,
    gap: "$2",
    p: "$3",
    borderWidth: "1px",
    borderColor: "$neutral5",
    borderRadius: "$lg",
    bg: "$neutral2",
    color: "$neutral12",
    cursor: "pointer",
    transition: "background-color 0.15s, border-color 0.15s",
    _hover: { borderColor: "$neutral7" },
    _focusWithin: { outline: "2px solid $primary8", outlineOffset: "2px" },
    css: {
      "&[data-selected=true]": {
        bg: "$primary2",
        borderColor: "$primary7",
      },
      "&[data-disabled=true]": { cursor: "default" },
      "& input": {
        width: "16px",
        height: "16px",
        margin: 0,
        flexShrink: 0,
        accentColor: "var(--hope-colors-primary9)",
        cursor: "inherit",
        colorScheme: "light",
        _dark: { colorScheme: "dark" },
      },
    },
  };
  const choiceGrid = {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "$2",
    css: { "@media (max-width: 540px)": { gridTemplateColumns: "1fr" } },
  };

  return (
    <ModalContent
      width={760}
      maxWidth="calc(100vw - 32px)"
      maxHeight="calc(100vh - 32px)"
      margin={0}
      borderRadius={12}
      overflow="hidden"
      bg="$neutral1"
      style={{ "font-variant-numeric": "tabular-nums" }}
    >
      <ModalHeader
        px="$5"
        pt="$4"
        pb="$4"
        fontSize="$lg"
        fontWeight={600}
        color="$neutral12"
      >
        {props.verification ? "Verify game files" : "Install game"}
      </ModalHeader>
      <ModalCloseButton top="$3" right="$3" />
      <ModalBody px="$5" pb="$4" pt={0} minH={0} overflowX="hidden">
        <VStack alignItems="stretch" spacing="$4">
          <FormControl id={`${id}-directory`}>
            <FormLabel fontSize="$sm">Game directory</FormLabel>
            <HStack spacing="$2">
              <Input
                readOnly
                size="sm"
                value={props.game.installDir()}
                title={props.game.installDir()}
                placeholder="Choose a directory"
                minW={0}
                bg="$neutral2"
                css={{ textOverflow: "ellipsis" }}
              />
              <Button
                variant="subtle"
                size="sm"
                flexShrink={0}
                disabled={busy()}
                onClick={chooseDirectory}
              >
                Browse…
              </Button>
            </HStack>
          </FormControl>
          <Show when={options.loading || props.game.loading()}>
            <Text role="status" size="sm" color="$neutral11">
              Loading installation options…
            </Text>
          </Show>
          <Show when={error()}>
            <Text
              role="alert"
              size="sm"
              color="$danger11"
              css={{ overflowWrap: "anywhere" }}
            >
              {error()}
            </Text>
            <Button
              variant="subtle"
              size="sm"
              alignSelf="flex-start"
              disabled={busy()}
              onClick={() => {
                setDirectoryError("");
                refetch();
              }}
            >
              Retry
            </Button>
          </Show>
          <Show when={catalog()}>
            <Box as="fieldset" border={0} p={0} minW={0}>
              <FormLabel as="legend" fontSize="$sm">
                Installation mode
              </FormLabel>
              <Box
                {...choiceGrid}
                gridTemplateColumns={
                  catalog()?.modes.length === 1
                    ? "1fr"
                    : "repeat(2, minmax(0, 1fr))"
                }
              >
                <For each={catalog()?.modes}>
                  {option => (
                    <Box
                      as="label"
                      {...optionStyle}
                      flexDirection="column"
                      data-selected={mode() === option.mode}
                      data-disabled={busy() || resuming()}
                      for={`${id}-mode-${option.mode}`}
                    >
                      <HStack spacing="$2" minW={0}>
                        <input
                          type="radio"
                          id={`${id}-mode-${option.mode}`}
                          name={`${id}-mode`}
                          value={option.mode}
                          aria-label={option.label}
                          checked={mode() === option.mode}
                          disabled={busy() || resuming()}
                          aria-describedby={
                            option.description
                              ? `${id}-${option.mode}-description`
                              : undefined
                          }
                          onChange={() => setSelectedMode(option.mode)}
                        />
                        <Text as="span" size="sm" fontWeight={600}>
                          {option.label}
                        </Text>
                        <Text
                          as="span"
                          size="sm"
                          color="$neutral11"
                          ml="auto"
                          flexShrink={0}
                        >
                          {humanFileSize(option.size)}
                        </Text>
                      </HStack>
                      <Show when={option.description}>
                        <Text
                          id={`${id}-${option.mode}-description`}
                          fontSize="13px"
                          lineHeight="1.5"
                          color="$neutral11"
                          css={{
                            whiteSpace: "pre-line",
                            overflowWrap: "anywhere",
                          }}
                        >
                          {option.description}
                        </Text>
                      </Show>
                    </Box>
                  )}
                </For>
              </Box>
            </Box>
            <Show when={catalog()?.voicePacks.length}>
              <Box as="fieldset" border={0} p={0} minW={0}>
                <FormLabel as="legend" fontSize="$sm">
                  Voice packs
                </FormLabel>
                <Box {...choiceGrid}>
                  <For each={catalog()?.voicePacks}>
                    {pack => (
                      <Box
                        as="label"
                        {...optionStyle}
                        alignItems="center"
                        data-selected={voicePacks().includes(pack.id)}
                        data-disabled={
                          busy() ||
                          resuming() ||
                          existingVoices().includes(pack.id)
                        }
                        for={`${id}-voice-${pack.id}`}
                      >
                        <input
                          type="checkbox"
                          id={`${id}-voice-${pack.id}`}
                          checked={voicePacks().includes(pack.id)}
                          disabled={
                            busy() ||
                            resuming() ||
                            existingVoices().includes(pack.id)
                          }
                          onChange={() =>
                            setSelectedVoices(values =>
                              values.includes(pack.id)
                                ? values.filter(value => value !== pack.id)
                                : [...values, pack.id]
                            )
                          }
                        />
                        <Text as="span" size="sm" fontWeight={500}>
                          {pack.label}
                        </Text>
                        <Text
                          as="span"
                          size="sm"
                          color="$neutral11"
                          ml="auto"
                          flexShrink={0}
                        >
                          {humanFileSize(pack.size)}
                        </Text>
                      </Box>
                    )}
                  </For>
                </Box>
              </Box>
            </Show>
          </Show>
        </VStack>
      </ModalBody>
      <ModalFooter
        gap="$2"
        px="$5"
        py="$3"
        flexShrink={0}
        borderTopWidth="1px"
        borderColor="$neutral5"
        bg="$neutral2"
      >
        <VStack alignItems="flex-start" spacing={0} mr="auto">
          <Text size="xs" color="$neutral11">
            Total installed size
          </Text>
          <Text
            fontSize="$xl"
            fontWeight={600}
            color="$neutral12"
            aria-live="polite"
          >
            {totalSize()}
          </Text>
        </VStack>
        <Button size="sm" variant="subtle" onClick={props.onClose}>
          Cancel
        </Button>
        <Button
          size="sm"
          disabled={
            busy() || Boolean(error()) || !catalog() || !props.game.installDir()
          }
          onClick={() =>
            props.onConfirm({ mode: mode(), voicePacks: voicePacks() })
          }
        >
          {props.verification ? "Verify" : resuming() ? "Resume" : "Install"}
        </Button>
      </ModalFooter>
    </ModalContent>
  );
}

import {
  Box,
  Button,
  Divider,
  FormControl,
  FormHelperText,
  FormLabel,
  HStack,
  Input,
  Select,
  SelectContent,
  SelectIcon,
  SelectListbox,
  SelectOption,
  SelectOptionIndicator,
  SelectOptionText,
  SelectTrigger,
  SelectValue,
  Switch,
  Text,
  VStack,
} from "@hope-ui/solid";
import { createEffect, createSignal, For, Show } from "solid-js";
import { openDir } from "@utils";
import type { SophonGame } from "../sophon/game";
import {
  SophonSettings,
  sophonDefaults,
  sophonNumberSettings,
  sophonSettingsError,
} from "../sophon/settings";

function Choice<T extends string>(props: {
  label: string;
  value: T;
  options: { value: T; label: string; disabled?: boolean }[];
  onChange: (value: T) => void;
}) {
  return (
    <FormControl>
      <FormLabel>{props.label}</FormLabel>
      <Select value={props.value} onChange={props.onChange}>
        <SelectTrigger>
          <SelectValue />
          <SelectIcon />
        </SelectTrigger>
        <SelectContent>
          <SelectListbox>
            <For each={props.options}>
              {option => (
                <SelectOption value={option.value} disabled={option.disabled}>
                  <SelectOptionText>{option.label}</SelectOptionText>
                  <SelectOptionIndicator />
                </SelectOption>
              )}
            </For>
          </SelectListbox>
        </SelectContent>
      </Select>
    </FormControl>
  );
}

export function SophonSettingsPanel(props: { game: SophonGame }) {
  const [value, setValue] = createSignal<SophonSettings>({
    ...props.game.settings(),
  });
  const [saving, setSaving] = createSignal(false);
  const [error, setError] = createSignal("");
  const [saved, setSaved] = createSignal(false);
  createEffect(() => setValue({ ...props.game.settings() }));
  const disabled = () =>
    saving() || props.game.operationRunning() || props.game.loading();
  const invalid = () => sophonSettingsError(value());
  const dirty = () =>
    JSON.stringify(value()) !== JSON.stringify(props.game.settings());

  function update(settings: Partial<SophonSettings>) {
    setValue(previous => ({ ...previous, ...settings }));
    setError("");
    setSaved(false);
  }

  async function save() {
    if (disabled() || invalid()) return;
    setSaving(true);
    setError("");
    try {
      await props.game.saveSettings(value());
      setSaved(true);
    } catch (error) {
      setError(String(error));
    } finally {
      setSaving(false);
    }
  }

  function NumberSetting(props: {
    field: (typeof sophonNumberSettings)[number];
  }) {
    const field = props.field;
    const minimum = () =>
      field.key === "maxCachedFileHandles" && value().ioPolicy === "parallel"
        ? value().writes
        : field.min;
    return (
      <FormControl
        disabled={
          (field.key === "writes" && value().ioPolicy === "serialized") ||
          (field.key === "diskGiB" && !value().diskCacheEnabled)
        }
      >
        <FormLabel>{field.label}</FormLabel>
        <Input
          type="number"
          required
          min={minimum()}
          max={field.max}
          step={1}
          value={Number.isFinite(value()[field.key]) ? value()[field.key] : ""}
          onInput={event =>
            update({ [field.key]: event.currentTarget.valueAsNumber })
          }
        />
        <Show when={field.key === "writes"}>
          <FormHelperText>
            {value().ioPolicy === "serialized"
              ? "Serialized I/O uses one write worker."
              : "Applies to installation writes and update patching."}
          </FormHelperText>
        </Show>
        <Show when={field.key === "checks"}>
          <FormHelperText>
            Reading and hashing files, with either I/O policy.
          </FormHelperText>
        </Show>
        <Show when={field.key === "memoryMiB"}>
          <FormHelperText>
            Working cache budget; total memory use can be higher.
          </FormHelperText>
        </Show>
        <Show when={field.key === "diskGiB"}>
          <FormHelperText>
            Working cache budget; excludes predownloads and temporary game
            output.
          </FormHelperText>
        </Show>
      </FormControl>
    );
  }

  return (
    <form
      onSubmit={event => {
        event.preventDefault();
        void save();
      }}
    >
      <fieldset
        disabled={disabled()}
        style={{ border: "0", padding: "0", margin: "0", "min-width": "0" }}
      >
        <VStack spacing="$5" alignItems="stretch">
          <Text fontSize="$lg" fontWeight={600}>
            Sophon downloader
          </Text>
          <Text size="sm" color="$neutral11">
            Transfer settings apply to the next operation.
          </Text>
          <FormControl>
            <FormLabel>Predownload directory</FormLabel>
            <Input
              readOnly
              value={value().predownloadDirectory}
              placeholder="Automatic (saved location or game directory)"
            />
            <HStack spacing="$2" mt="$2">
              <Button
                type="button"
                size="sm"
                onClick={async () => {
                  try {
                    const directory = await openDir(
                      "Choose predownload directory"
                    );
                    if (directory) update({ predownloadDirectory: directory });
                  } catch (error) {
                    setError(String(error));
                  }
                }}
              >
                Browse…
              </Button>
              <Button
                type="button"
                size="sm"
                variant="subtle"
                disabled={!value().predownloadDirectory}
                onClick={() => update({ predownloadDirectory: "" })}
              >
                Use default
              </Button>
            </HStack>
            <FormHelperText>
              Existing predownloads stay in their current folder.
            </FormHelperText>
          </FormControl>
          <For
            each={sophonNumberSettings.filter(
              field => field.key === "downloads"
            )}
          >
            {field => <NumberSetting field={field} />}
          </For>
          <VStack
            as="section"
            aria-labelledby="sophon-advanced-heading"
            spacing="$5"
            alignItems="stretch"
            bg="$danger2"
            borderWidth="1px"
            borderColor="$danger6"
            borderRadius={12}
            p="$5"
          >
            <Box color="$danger11">
              <Text as="h3" id="sophon-advanced-heading" fontWeight={600}>
                Advanced settings
              </Text>
              <Text size="sm">
                Only change these settings if you know what you're doing.
              </Text>
            </Box>
            <Choice
              label="I/O policy"
              value={value().ioPolicy}
              onChange={ioPolicy => update({ ioPolicy })}
              options={[
                { value: "parallel", label: "Parallel" },
                { value: "serialized", label: "Serialized" },
              ]}
            />
            <Box
              display="grid"
              gridTemplateColumns="repeat(auto-fit, minmax(min(100%, 220px), 1fr))"
              gap="$4"
            >
              <For
                each={sophonNumberSettings.filter(
                  field => field.key !== "downloads"
                )}
              >
                {field => <NumberSetting field={field} />}
              </For>
            </Box>
            <FormControl>
              <Switch
                checked={value().diskCacheEnabled}
                disabled={value().writeMode === "in-place"}
                onChange={() =>
                  update({ diskCacheEnabled: !value().diskCacheEnabled })
                }
              >
                Disk caching
              </Switch>
              <Show when={value().writeMode === "in-place"}>
                <FormHelperText>Required for in-place updates.</FormHelperText>
              </Show>
            </FormControl>
            <Divider borderColor="$danger6" />
            <Choice
              label="Update write mode"
              value={value().writeMode}
              onChange={writeMode => update({ writeMode })}
              options={[
                { value: "temporary", label: "Temporary replacement" },
                {
                  value: "in-place",
                  label: "In-place",
                  disabled: !value().diskCacheEnabled,
                },
              ]}
            />
            <FormControl>
              <Switch
                checked={value().preserveState}
                onChange={() =>
                  update({ preserveState: !value().preserveState })
                }
              >
                Preserve resume state
              </Switch>
              <FormHelperText>
                Turning this off discards checkpoints and working cache on the
                next operation.
              </FormHelperText>
            </FormControl>
            <Divider borderColor="$danger6" />
            <Switch
              checked={value().debugLogging}
              onChange={() => update({ debugLogging: !value().debugLogging })}
            >
              Debug logging
            </Switch>
          </VStack>
          <Show when={invalid() || error()}>
            <Text size="sm" color="$danger11" role="alert">
              {invalid() || error()}
            </Text>
          </Show>
          <HStack spacing="$3">
            <Button type="submit" disabled={!dirty() || Boolean(invalid())}>
              {saving() ? "Saving…" : "Save changes"}
            </Button>
            <Button
              type="button"
              variant="subtle"
              onClick={() => update(sophonDefaults)}
            >
              Reset to defaults
            </Button>
          </HStack>
          <Show when={saved()}>
            <Text size="sm" role="status">
              Saved.
            </Text>
          </Show>
        </VStack>
      </fieldset>
    </form>
  );
}

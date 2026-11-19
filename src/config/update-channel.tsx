import {
  FormControl,
  FormLabel,
  Select,
  SelectContent,
  SelectIcon,
  SelectListbox,
  SelectOption,
  SelectOptionIndicator,
  SelectOptionText,
  SelectTrigger,
  SelectValue,
  Text,
} from "@hope-ui/solid";
import { createSignal, For, Show } from "solid-js";
import { setKey } from "../utils";
import {
  getUpdateChannel,
  UPDATE_CHANNEL_KEY,
  updateChannels,
  UpdateChannel,
} from "../updater";

export async function createUpdateChannelConfig() {
  const [value, setValue] = createSignal(await getUpdateChannel());
  const [saving, setSaving] = createSignal(false);
  const [error, setError] = createSignal("");

  async function save(channel: UpdateChannel) {
    if (saving()) return;
    setSaving(true);
    setError("");
    try {
      await setKey(UPDATE_CHANNEL_KEY, channel);
      setValue(channel);
      await Neutralino.events.dispatch("updateChannelChanged");
    } catch (error) {
      setError(String(error));
    } finally {
      setSaving(false);
    }
  }

  return [
    function UI() {
      return (
        <FormControl disabled={saving()}>
          <FormLabel>Launcher update channel</FormLabel>
          <Select value={value()} onChange={save}>
            <SelectTrigger>
              <SelectValue />
              <SelectIcon />
            </SelectTrigger>
            <SelectContent>
              <SelectListbox>
                <For each={updateChannels}>
                  {channel => (
                    <SelectOption value={channel.value}>
                      <SelectOptionText>{channel.label}</SelectOptionText>
                      <SelectOptionIndicator />
                    </SelectOption>
                  )}
                </For>
              </SelectListbox>
            </SelectContent>
          </Select>
          <Show when={error()}>
            <Text size="sm" color="$danger11">
              {error()}
            </Text>
          </Show>
        </FormControl>
      );
    },
  ] as const;
}

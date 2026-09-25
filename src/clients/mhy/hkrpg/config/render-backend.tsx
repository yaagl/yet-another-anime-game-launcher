import {
  Badge,
  Button,
  FormControl,
  FormLabel,
  HStack,
  Select,
  SelectContent,
  SelectIcon,
  SelectListbox,
  SelectOption,
  SelectOptionIndicator,
  SelectOptionText,
  SelectTrigger,
  SelectValue,
  VStack,
  notificationService,
} from "@hope-ui/solid";
import { createSignal, Show } from "solid-js";
import { Config } from "@config/config-def";
import { getKeyOrDefault, setKey } from "@utils";
import { installD3DMetalFromDMG } from "../../../../d3dmetal";

declare module "@config/config-def" {
  interface Config {
    renderBackend: "dxmt" | "d3dmetal";
  }
}

const BACKEND_KEY = "hkrpg_render_backend";

export default async function ({ config }: { config: Partial<Config> }) {
  const storedBackend = await getKeyOrDefault(BACKEND_KEY, "dxmt");
  config.renderBackend = storedBackend === "d3dmetal" ? "d3dmetal" : "dxmt";

  const [backend, setBackend] = createSignal(config.renderBackend);
  const [installed, setInstalled] = createSignal(
    (await getKeyOrDefault("hkrpg_d3dmetal_installed", "false")) === "true"
  );
  const [installing, setInstalling] = createSignal(false);

  async function changeBackend(value: string) {
    const next = value === "d3dmetal" ? "d3dmetal" : "dxmt";
    await setKey(BACKEND_KEY, next);
    config.renderBackend = next;
    setBackend(next);
  }

  async function importDMG() {
    if (installing()) return;
    setInstalling(true);
    try {
      const paths = await Neutralino.os.showOpenDialog("Select GPTK DMG", {
        filter: [{ name: "Disk Image", extensions: ["dmg"] }],
      });
      if (!paths[0]) return;

      for await (const _step of installD3DMetalFromDMG(paths[0])) {
        // Keep the button busy until import finishes.
      }
      setInstalled(true);
      await changeBackend("d3dmetal");
      notificationService.show({
        status: "success",
        title: "D3DMetal installed",
        description: "",
      });
    } catch (error) {
      notificationService.show({
        status: "danger",
        title: "D3DMetal installation failed",
        description: String(error),
      });
    } finally {
      setInstalling(false);
    }
  }

  return [
    function UI() {
      return (
        <FormControl>
          <FormLabel>Render Backend</FormLabel>
          <VStack spacing="$2" alignItems="start">
            <Select value={backend()} onChange={changeBackend}>
              <SelectTrigger>
                <SelectValue />
                <SelectIcon />
              </SelectTrigger>
              <SelectContent>
                <SelectListbox>
                  <SelectOption value="dxmt">
                    <SelectOptionText>DXMT</SelectOptionText>
                    <SelectOptionIndicator />
                  </SelectOption>
                  <SelectOption value="d3dmetal">
                    <SelectOptionText>D3DMetal</SelectOptionText>
                    <SelectOptionIndicator />
                  </SelectOption>
                </SelectListbox>
              </SelectContent>
            </Select>
            <HStack spacing="$2">
              <Button size="sm" disabled={installing()} onClick={importDMG}>
                {installing() ? "Installing…" : "Import GPTK DMG…"}
              </Button>
              <Show when={installed()}>
                <Badge colorScheme="success">Installed</Badge>
              </Show>
            </HStack>
          </VStack>
        </FormControl>
      );
    },
  ] as const;
}

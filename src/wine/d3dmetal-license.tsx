import {
  Box,
  Button,
  Center,
  Checkbox,
  HStack,
  Text,
  VStack,
} from "@hope-ui/solid";
import { createSignal, onCleanup, onMount, Show } from "solid-js";
import type { Component } from "solid-js";
import type { Locale } from "../locale";

export function createD3DMetalLicenseUI({
  locale,
  loadLicense,
  onAccept,
}: {
  locale: Locale;
  loadLicense: () => Promise<string>;
  onAccept: () => Component;
}): Component {
  return function D3DMetalLicenseUI() {
    const [license, setLicense] = createSignal("");
    const [loading, setLoading] = createSignal(true);
    const [error, setError] = createSignal(false);
    const [acknowledged, setAcknowledged] = createSignal(false);
    const [installer, setInstaller] = createSignal<Component>();
    let cancelled = false;
    let accepted = false;

    async function load() {
      setLoading(true);
      setError(false);
      setLicense("");
      setAcknowledged(false);
      try {
        const text = await loadLicense();
        if (!text.trim()) throw new Error("Empty license");
        if (!cancelled) setLicense(text);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    onMount(() => {
      void load();
    });
    onCleanup(() => {
      cancelled = true;
    });

    return (
      <Show
        when={installer()}
        fallback={
          <Center minHeight="100vh" width="100vw" p="$6">
            <VStack
              alignItems="stretch"
              spacing="$4"
              width="100%"
              maxWidth="800px"
            >
              <h1>{locale.get("D3DMETAL_LICENSE_TITLE")}</h1>
              <Text>Wine 11.17 D3DMetal (GPTK 4.0b2, experimental)</Text>
              <Text>{locale.get("D3DMETAL_LICENSE_SOURCE")}</Text>
              <Show when={loading()}>
                <Text role="status">
                  {locale.get("D3DMETAL_LICENSE_LOADING")}
                </Text>
              </Show>
              <Show when={error()}>
                <Text role="alert">{locale.get("D3DMETAL_LICENSE_ERROR")}</Text>
                <Button
                  onClick={() => {
                    void load();
                  }}
                >
                  {locale.get("D3DMETAL_LICENSE_RETRY")}
                </Button>
              </Show>
              <Show when={!loading() && !error()}>
                <Box
                  as="section"
                  aria-label={locale.get("D3DMETAL_LICENSE_TITLE")}
                  borderWidth="1px"
                  borderRadius="$md"
                  p="$4"
                  height="min(55vh, 480px)"
                  overflowY="auto"
                  overflowX="hidden"
                >
                  <Text
                    as="pre"
                    style={{
                      "white-space": "pre-wrap",
                      "overflow-wrap": "anywhere",
                      "font-family": "inherit",
                    }}
                  >
                    {license()}
                  </Text>
                </Box>
                <Checkbox
                  checked={acknowledged()}
                  onChange={() => setAcknowledged(value => !value)}
                >
                  {locale.get("D3DMETAL_LICENSE_ACKNOWLEDGE")}
                </Checkbox>
              </Show>
              <HStack spacing="$3" justifyContent="flex-end">
                <Button
                  variant="ghost"
                  onClick={() => {
                    cancelled = true;
                    void Neutralino.app.exit(0);
                  }}
                >
                  {locale.get("SETTING_CANCEL")}
                </Button>
                <Button
                  disabled={
                    loading() || error() || !license() || !acknowledged()
                  }
                  onClick={() => {
                    if (
                      accepted ||
                      cancelled ||
                      loading() ||
                      error() ||
                      !license() ||
                      !acknowledged()
                    )
                      return;
                    accepted = true;
                    setInstaller(() => onAccept());
                  }}
                >
                  {locale.get("D3DMETAL_LICENSE_ACCEPT")}
                </Button>
              </HStack>
            </VStack>
          </Center>
        }
      >
        {installerComponent => {
          const Installer = installerComponent();
          return <Installer />;
        }}
      </Show>
    );
  };
}

import {
  Box,
  Button,
  Center,
  Heading,
  HStack,
  Image,
  Modal,
  ModalOverlay,
  Text,
  VStack,
} from "@hope-ui/solid";
import { createSignal, Show } from "solid-js";
import type { Component } from "solid-js";
import { UPDATE_UI_IMAGE } from "../clients";
import { createInitialSetupConfiguration } from "../config";
import type { Locale } from "../locale";
import { fatal } from "../utils";
import type { WineDistribution } from "./distro";

export async function createInitialSetupUI({
  locale,
  defaultWineDistro,
  onSelectRecommended,
  onSelectCustom,
}: {
  locale: Locale;
  defaultWineDistro: WineDistribution;
  onSelectRecommended: (onBack: () => void) => Promise<Component>;
  onSelectCustom: (
    distro: WineDistribution,
    onBack: () => void
  ) => Promise<Component>;
}): Promise<Component> {
  const CustomConfigModalContent = await createInitialSetupConfiguration({
    locale,
    defaultWineDistro,
  });

  return function InitialSetupUI() {
    const [installer, setInstaller] = createSignal<Component>();
    const [customOpen, setCustomOpen] = createSignal(false);
    const resetInstaller = () => setInstaller(undefined);

    return (
      <Show
        when={installer()}
        fallback={
          <Center h="100vh" w="100vw" bg="$neutral1" p="$6">
            <VStack alignItems="center" spacing="$6" w="100%" maxW="520px">
              <Image boxSize={240} src={UPDATE_UI_IMAGE} />
              <Box
                bg="$neutral2"
                borderWidth="1px"
                borderColor="$neutral5"
                borderRadius={12}
                p="$6"
                w="100%"
                shadow="$sm"
              >
                <VStack spacing="$4" alignItems="stretch">
                  <Heading
                    level="2"
                    size="xl"
                    textAlign="center"
                    color="$neutral12"
                  >
                    {locale.get("SETUP_TITLE")}
                  </Heading>
                  <Text textAlign="center" color="$neutral11" fontSize="$sm">
                    {locale.get("SETUP_DESC")}
                  </Text>
                  <HStack spacing="$4" pt="$2" justifyContent="center">
                    <Button
                      flex={1}
                      size="lg"
                      onClick={() => {
                        void onSelectRecommended(resetInstaller)
                          .then(comp => setInstaller(() => comp))
                          .catch(fatal);
                      }}
                    >
                      {locale.get("SETUP_RECOMMENDED")}
                    </Button>
                    <Button
                      flex={1}
                      size="lg"
                      variant="subtle"
                      colorScheme="neutral"
                      onClick={() => setCustomOpen(true)}
                    >
                      {locale.get("SETUP_CUSTOM")}
                    </Button>
                  </HStack>
                </VStack>
              </Box>
            </VStack>
            <Modal
              opened={customOpen()}
              onClose={() => setCustomOpen(false)}
              scrollBehavior="inside"
            >
              <ModalOverlay />
              <CustomConfigModalContent
                onCancel={() => setCustomOpen(false)}
                onConfirm={distro => {
                  setCustomOpen(false);
                  void onSelectCustom(distro, resetInstaller)
                    .then(comp => setInstaller(() => comp))
                    .catch(fatal);
                }}
              />
            </Modal>
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

import {
  Box,
  Button,
  Divider,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  Text,
  VStack
} from '@hope-ui/solid'
import { CURRENT_YAAGL_VERSION } from '../../constants'
import { Locale } from '../../locale'
import { Wine, WineVersionChecker } from '../../wine'
import { Config } from './config-def'
import { createDxvkAsyncConfig } from './dxvk-async'
import { createDxvkHUDConfig } from './dxvk-hud'
import { createGameInstallDirConfig } from './game-install-dir'
import { createRetinaConfig } from './retina'
import { createWineDistroConfig } from './wine-distribution'
import { createWorkaround3Config } from './workaround-3'
import createLocaleConfig from './ui-locale'
import createPatchOff from './patch-off'
import { exec2, resolve } from '../../utils'

export async function createConfiguration ({
  wine,
  wineVersionChecker,
  locale,
  gameInstallDir
}: {
  wine: Wine
  wineVersionChecker: WineVersionChecker
  locale: Locale
  gameInstallDir: () => string
}) {
  const config: Partial<Config> = {}
  const [WD] = await createWineDistroConfig({
    locale,
    config,
    wineVersionChecker
  })
  const [DA] = await createDxvkAsyncConfig({ locale, config })
  const [DH] = await createDxvkHUDConfig({ locale, config })
  const [R] = await createRetinaConfig({ locale, config })
  const [GID] = await createGameInstallDirConfig({
    locale,
    config,
    gameInstallDir
  })

  const [W3] = await createWorkaround3Config({ locale, config })
  const [UL] = await createLocaleConfig({ locale, config })
  const [PO] = await createPatchOff({ locale, config })

  return {
    UI: function (props: {
      onClose: (action: 'check-integrity' | 'close') => void
    }) {
      return (
        <ModalContent height={570} width={1000} maxWidth={1000}>
          <ModalCloseButton />
          <ModalHeader>{locale.get('SETTING')}</ModalHeader>
          <ModalBody pb={20}>
            <Tabs orientation='vertical' h='100%'>
              <TabList>
                <Tab>{locale.get('SETTING_GENERAL')}</Tab>
                <Tab>Wine</Tab>
              </TabList>
              <TabPanel flex={1} pt={0} pb={0}>
                <HStack spacing='$4' h='100%'>
                  <Box
                    width='40%'
                    alignSelf='stretch'
                    overflowY='scroll'
                    pr={16}
                  >
                    <VStack spacing='$4'>
                      <GID />
                      <Divider />
                      <DA />
                      <DH />
                      <R />
                      <Divider />
                      <PO />
                      <W3 />
                      <Divider />
                      <UL />
                      <FormControl>
                        <FormLabel>Yaagl version</FormLabel>
                        <Text>{CURRENT_YAAGL_VERSION}</Text>
                      </FormControl>
                    </VStack>
                  </Box>
                  <Box flex={1} />
                  <VStack
                    spacing='$1'
                    width='30%'
                    alignItems='start'
                    alignSelf='start'
                  >
                    <Heading level='1' ml={12} mb='$4'>
                      {locale.get('SETTING_QUICK_ACTIONS')}
                    </Heading>
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() => props.onClose('check-integrity')}
                    >
                      {locale.get('SETTING_CHECK_INTEGRITY')}
                    </Button>
                    <Divider />
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={async () =>
                        await wine.openCmdWindow({
                          gameDir: gameInstallDir()
                        })}
                    >
                      {locale.get('SETTING_OPEN_CMD')}
                    </Button>
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={async () =>
                        await exec2(
                          ['open', gameInstallDir()],
                          {},
                          false,
                          '/dev/null'
                        )}
                    >
                      {locale.get('SETTING_OPEN_GAME_INSTALL_DIR')}
                    </Button>
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={async () =>
                        await exec2(
                          ['open', await resolve('./')],
                          {},
                          false,
                          '/dev/null'
                        )}
                    >
                      {locale.get('SETTING_OPEN_YAAGL_DIR')}
                    </Button>
                  </VStack>
                </HStack>
              </TabPanel>
              <TabPanel flex={1} pt={0} pb={0} h='100%'>
                <VStack spacing='$4' w='40%' alignItems='start'>
                  <WD />
                </VStack>
              </TabPanel>
            </Tabs>
          </ModalBody>
        </ModalContent>
      )
    },
    config: config as Config // FIXME: better method than type assertation?
  }
}

export type { Config }

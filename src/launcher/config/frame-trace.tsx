import { Box, Checkbox, FormControl, FormLabel } from "@hope-ui/solid";
import { createEffect, createSignal } from "solid-js";
import { Locale } from "../../locale";
import { getKey, setKey } from "../../utils";
import { Config, NOOP } from "./config-def";

declare module "./config-def" {
    interface Config {
        frameTrace: boolean;
    }
}

export default async function ({
    locale,
    config
}: {
    config: Partial<Config>;
    locale: Locale;
}) {
    try {
        config.frameTrace = (await getKey("config_frameTrace")) == "true";
    } catch {
        config.frameTrace = false; // default value
    }

    const [valve, setValue] = createSignal(config.frameTrace);

    async function onSave(apply: boolean) {
        if (!apply) {
            setValue(config.frameTrace!);
            return NOOP;
        }
        if (config.frameTrace! == valve()) return NOOP;
        config.frameTrace = valve();
        await setKey("config_frameTrace", config.frameTrace! ? "true" : "false");
        return NOOP
    }

    createEffect(() => {
        valve();
        onSave(true);
    });

    return [
        function UI() {
            return (
                <FormControl id="frameTrace">
                    <FormLabel>{locale.get("SETTING_FRAME_TRACE")}</FormLabel>
                    <Box>
                        <Checkbox
                          checked = {valve()}
                          onChange = {() => setValue((x) => !x)}
                          size = "md"
                        >
                          {locale.get("SETTING_ENABLED")}
                        </Checkbox>
                    </Box>
                </FormControl>
            );
        },
    ] as const;
}
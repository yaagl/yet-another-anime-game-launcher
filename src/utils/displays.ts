import { exec } from "./neu";

interface unparsedDisplay {
  _name: string;
  spdisplays_connection_type: string | undefined;
  spdisplays_main: string | undefined;
  _spdisplays_pixels: string;         // Appears to be the internal render resolution
  _spdisplays_resolution: string;     // The resolution that the display is set to (Shown in settings)
  spdisplays_pixelresolution: string; // The real resolution of the display
}

interface unparsedAdapter {
  _name: string;
  spdisplays_ndrvs: unparsedDisplay[];
  spdisplays_mtlgpufamilysupport: string | undefined;
}

interface Display {
  name: string;
  internal: boolean;
  primary: boolean;
  hiDPI: boolean;
  renderResolution: number[];
  scaledResolution: number[];
  physicalResolution: number[] | undefined;
  refreshRate: number;
}

interface DisplayAdapter {
  name: string;
  metalSupport: string | undefined;
  displays: Display[];
}

interface DisplayConfiguration {
  displayAdapters: DisplayAdapter[];
  displays: Display[];
}

function parseDisplay(displayJson: unparsedDisplay): Display {
  const name: string = displayJson._name;
  const internal: boolean = (
    displayJson.spdisplays_connection_type ?? "external"
  ).includes("internal");
  const primary: boolean = (displayJson.spdisplays_main ?? "no").includes(
    "yes"
  );
  const renderResolution: number[] =
    displayJson._spdisplays_pixels
      .split("x")
      .map((item: string) => parseInt(item)) ?? [];
  const scaledResolution: number[] =
    displayJson._spdisplays_resolution
      .split("@")[0]
      .split("x")
      .map((item: string) => parseInt(item)) ?? [];
  const physicalResolution: number[] | undefined = ((str: string): number[] | undefined => {
    const matches = str.match(/(\d+)\s*[×xX]\s*(\d+)/);
    return matches ? [parseInt(matches[1]), parseInt(matches[2])] : undefined;
  })(displayJson.spdisplays_pixelresolution)

  const hiDPI: boolean = renderResolution[0] != scaledResolution[0];
  const refreshRate: number = parseFloat(
    displayJson._spdisplays_resolution.split("@")[1].split("Hz")[0]
  );

  return {
    name: name,
    internal: internal,
    primary: primary,
    hiDPI: hiDPI,
    renderResolution: renderResolution,
    scaledResolution: scaledResolution,
    physicalResolution: physicalResolution,
    refreshRate: refreshRate,
  };
}

function parseAdapter(adapterJson: unparsedAdapter): DisplayAdapter {
  const name: string = adapterJson._name;
  const metalSupport: string | undefined =
    adapterJson.spdisplays_mtlgpufamilysupport ?? undefined;
  const displays: Display[] = [];
  for (const displayJson of adapterJson.spdisplays_ndrvs ?? []) {
    displays.push(parseDisplay(displayJson));
  }

  return {
    name: name,
    metalSupport: metalSupport,
    displays: displays,
  };
}

function parseDisplayConfiguration(configJson: string) {
  const displayAdapterArray: unparsedAdapter[] =
    JSON.parse(configJson).SPDisplaysDataType ?? [];
  const displayAdapters: DisplayAdapter[] = [];
  for (const adapterJson of displayAdapterArray) {
    displayAdapters.push(parseAdapter(adapterJson));
  }

  const displays: Display[] = [];
  for (const displayAdapter of displayAdapters) {
    for (const display of displayAdapter.displays) {
      displays.push(display);
    }
  }

  return {
    displayAdapters: displayAdapters,
    displays: displays,
  };
}

export async function getDisplayConfiguration(): Promise<DisplayConfiguration> {
  const cmd = `system_profiler SPDisplaysDataType -json`;
  const cmdOutput = (
    await exec(["/bin/bash", "-c", cmd], {}, false)
  ).stdOut.toString();

  return parseDisplayConfiguration(cmdOutput);
}

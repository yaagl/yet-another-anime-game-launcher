import { exec } from "./neu";

interface unparsedDisplay {
  _name: string;
  "_spdisplays_display-product-id": string;
  "_spdisplays_display-serial-number": string;
  "_spdisplays_display-vendor-id": string;
  spdisplays_connection_type: string | undefined;
  spdisplays_main: string | undefined;
  _spdisplays_pixels: string; // Appears to be the internal render resolution
  _spdisplays_resolution: string; // The resolution that the display is set to (Shown in settings)
  spdisplays_pixelresolution: string; // The real resolution of the display
}

interface unparsedAdapter {
  _name: string;
  spdisplays_ndrvs: unparsedDisplay[];
  spdisplays_mtlgpufamilysupport: string | undefined;
}

export interface Display {
  name: string;
  productId: string;
  serialNumber: string;
  vendorId: string;
  internal: boolean;
  primary: boolean;
  hiDPI: boolean | undefined;
  renderResolution: [number, number] | undefined;
  scaledResolution: [number, number] | undefined;
  physicalResolution: [number, number] | undefined;
  refreshRate: number | undefined;
}

export interface DisplayAdapter {
  name: string;
  metalSupport: string | undefined;
  displays: Display[];
}

export interface DisplayConfiguration {
  displayAdapters: DisplayAdapter[];
  displays: Display[];
}

function parseDisplay(displayJson: unparsedDisplay): Display {
  const name = displayJson._name;
  const productId = displayJson["_spdisplays_display-product-id"];
  const serialNumber = displayJson["_spdisplays_display-serial-number"];
  const vendorId = displayJson["_spdisplays_display-vendor-id"];

  const internal = (displayJson.spdisplays_connection_type ?? "").includes(
    "internal"
  );
  const primary = (displayJson.spdisplays_main ?? "").includes("yes");

  function parseResolution(str: string): [number, number] | undefined {
    const matches = str.match(/(\d+)\s*[×xX]\s*(\d+)/);
    return matches ? [parseInt(matches[1]), parseInt(matches[2])] : undefined;
  }

  const renderResolution = parseResolution(displayJson._spdisplays_pixels);
  const scaledResolution = parseResolution(displayJson._spdisplays_resolution);
  const physicalResolution = parseResolution(
    displayJson.spdisplays_pixelresolution
  );

  const hiDPI =
    renderResolution == undefined || scaledResolution == undefined
      ? undefined
      : renderResolution[0] != scaledResolution[0];
  const refreshRate = (str => {
    const matches = str.match(/@\s*([\d.]+)\s*Hz/i);
    return matches ? parseFloat(matches[1]) : undefined;
  })(displayJson._spdisplays_resolution);

  return {
    name: name,
    productId: productId,
    serialNumber: serialNumber,
    vendorId: vendorId,
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
  const name = adapterJson._name;
  const metalSupport = adapterJson.spdisplays_mtlgpufamilysupport ?? undefined;
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

export async function getDefaultDisplayScreenSize(): Promise<
  number | undefined
> {
  const cmd_inch = `ioreg -l | awk -F\\" '/product-name/ {if (match($4, /[0-9]+-inch/)) {print substr($4, RSTART, RLENGTH-5)}}'`;
  return parseInt(
    (await exec(["/bin/bash", "-c", cmd_inch], {}, false)).stdOut.toString()
  );
}

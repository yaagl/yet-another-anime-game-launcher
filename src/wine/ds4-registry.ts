const SERVICE = "system\\controlset001\\services\\winebus";
const SETTINGS = {
  DisableHidraw: 0,
  "Enable SDL": 0,
  KeepDS4BluetoothReportFixup: 1,
};
const SYNTHETIC = [
  "winebus\\vid_054c&pid_09cc",
  "winexinput\\vid_054c&pid_09cc&ig_00",
  "winexinput\\vid_054c&pid_09cc&xi_00",
  "hid\\vid_054c&pid_09cc&ig_00",
  "hid\\vid_054c&pid_09cc&xi_00",
].map(name => `system\\controlset001\\enum\\${name}`);

export interface DS4RegistryBackup {
  values: Record<string, string | null>;
  devices: string[];
}

function key(section: RegExpMatchArray) {
  return section[1].replaceAll("\\\\", "\\").toLowerCase();
}

function synthetic(section: RegExpMatchArray) {
  const name = key(section);
  return SYNTHETIC.some(x => name === x || name.startsWith(x + "\\"));
}

function parsed(text: string) {
  // Wine sections span multiple lines; preserve their original text verbatim.
  return [
    ...text.matchAll(/^\[([^\n]+)\][^\n]*\n[\s\S]*?(?=^\[|(?![\s\S]))/gm),
  ];
}

export function snapshotDS4Registry(text: string): DS4RegistryBackup {
  const all = parsed(text);
  const service = all.filter(s => key(s) === SERVICE);
  if (service.length !== 1)
    throw new Error("Expected one winebus registry key");
  const values: DS4RegistryBackup["values"] = {};
  for (const name of Object.keys(SETTINGS)) {
    const matches = service[0][0].match(
      new RegExp(`^"${name}"=[^\\n]*`, "gmi")
    );
    if (
      matches &&
      (matches.length !== 1 || !/=dword:[0-9a-f]{8}$/i.test(matches[0]))
    ) {
      throw new Error(`Invalid winebus DWORD: ${name}`);
    }
    values[name] = matches?.[0] ?? null;
  }
  return { values, devices: all.filter(synthetic).map(s => s[0]) };
}

export function setDS4RegistryValues(
  text: string,
  values: DS4RegistryBackup["values"]
) {
  snapshotDS4Registry(text);
  if (
    Object.keys(values).sort().join() !== Object.keys(SETTINGS).sort().join()
  ) {
    throw new Error("Incomplete DS4 registry backup");
  }
  const service = parsed(text).find(s => key(s) === SERVICE);
  if (!service) throw new Error("Missing winebus registry key");
  let replacement = service[0];
  for (const name of Object.keys(SETTINGS)) {
    const value = values[name];
    if (
      value !== null &&
      !new RegExp(`^"${name}"=dword:[0-9a-f]{8}$`, "i").test(value)
    ) {
      throw new Error(`Invalid saved winebus DWORD: ${name}`);
    }
    replacement = replacement.replace(
      new RegExp(`^"${name}"=[^\\n]*\\n?`, "gmi"),
      ""
    );
    if (value !== null) replacement = replacement.trimEnd() + `\n${value}\n\n`;
  }
  return text.replace(service[0], () => replacement);
}

function removeSynthetic(text: string) {
  for (const section of parsed(text).filter(synthetic)) {
    text = text.replace(section[0], "");
  }
  return text;
}

export function enableDS4Registry(text: string) {
  return setDS4RegistryValues(
    removeSynthetic(text),
    Object.fromEntries(
      Object.entries(SETTINGS).map(([name, value]) => [
        name,
        `"${name}"=dword:${value.toString(16).padStart(8, "0")}`,
      ])
    )
  );
}

export function restoreDS4Registry(text: string, backup: DS4RegistryBackup) {
  for (const device of backup.devices) {
    const entries = parsed(device);
    if (
      entries.length !== 1 ||
      entries[0][0] !== device ||
      !synthetic(entries[0])
    ) {
      throw new Error("DS4 backup contains an unrelated registry key");
    }
  }
  return (
    setDS4RegistryValues(removeSynthetic(text), backup.values).trimEnd() +
    "\n\n" +
    backup.devices.join("")
  );
}

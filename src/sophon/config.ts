import { Server } from "@constants";

export function gameConfigDefaults(contents: string, server: Server): string {
  const newline = contents.includes("\r\n") ? "\r\n" : "\n";
  const bom = contents.startsWith("\ufeff") ? "\ufeff" : "";
  const lines = contents.slice(bom.length).replace(/\r\n/g, "\n").split("\n");
  let start = lines.findIndex(line => /^\s*\[general\]\s*$/i.test(line));
  if (start < 0) {
    if (lines[lines.length - 1] === "") lines.pop();
    start = lines.length;
    lines.push("[General]", "");
  }
  let end = start + 1;
  while (end < lines.length && !/^\s*\[/.test(lines[end])) end++;
  const keys = new Set(
    lines
      .slice(start + 1, end)
      .map(line => line.split("=")[0].trim().toLowerCase())
  );
  const defaults = {
    channel: server.channel_id,
    sub_channel: server.subchannel_id,
    cps: server.cps,
  };
  const missing = Object.entries(defaults)
    .filter(([key]) => !keys.has(key))
    .map(([key, value]) => key + "=" + value);
  if (!missing.length) return contents;
  lines.splice(start + 1, 0, ...missing);
  return bom + lines.join(newline);
}

export type CommandSegments = (
  | string
  | CommandSegments
  | {
      _rawString_: string;
    }
)[];

const sanitize = (str: string) =>
  `${str}`
    .replaceAll("\\", "\\\\")
    .replaceAll(" ", "\\ ")
    .replaceAll('"', '\\"')
    .replaceAll("'", "\\'")
    .replaceAll("&", "\\&")
    .replaceAll("#", "\\#")
    .replaceAll("~", "\\~")
    .replaceAll("`", "\\`")
    .replaceAll("|", "\\|")
    .replaceAll("[", "\\[")
    .replaceAll("]", "\\]")
    .replaceAll("<", "\\<")
    .replaceAll(">", "\\>")
    .replaceAll("{", "\\{")
    .replaceAll("}", "\\}")
    .replaceAll("*", "\\*")
    .replaceAll("$", "\\$")
    .replaceAll("(", "\\(")
    .replaceAll(")", "\\)")
    .replaceAll(";", "\\;")
    .replaceAll("\n", "\\\\n")
    .replaceAll("\t", "\\\\t");

export function build(
  command: CommandSegments,
  env?: { [key: string]: string },
): string {
  const ret =
    Object.entries(env ?? {})
      .map(([key, value]) => {
        if (!value) {
          return "";
        }
        return `${key}=${sanitize(value)} `; // I can trust key has no space right?
      })
      .join("") +
    command
      .map(segment => {
        if (segment instanceof Array) {
          return `$(${build(segment)})`; // TODO: special handling
        } else if (typeof segment == "string") {
          return sanitize(segment);
        } else {
          return segment._rawString_;
        }
      })
      .join(" ");
  return ret;
}

export function rawString(str: string) {
  return {
    _rawString_: str,
  };
}

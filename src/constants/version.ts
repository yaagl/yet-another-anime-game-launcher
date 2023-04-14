export const CURRENT_YAAGL_VERSION: string =
  (import.meta.env["YAAGL_VERSION"] == ""
    ? null
    : import.meta.env["YAAGL_VERSION"]) ?? "development";

export const YAAGL_ADVANCED_ENABLE: boolean =
  import.meta.env["YAAGL_ADVANCED_ENABLE"] == "1" ? true : false;

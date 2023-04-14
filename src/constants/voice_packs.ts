export const VoicePacks = {
  Chinese: "zh-cn",
  "English(US)": "en-us",
  Japanese: "ja-jp",
  Korean: "ko-kr",
};

export const VoicePackNames = Object.fromEntries(
  Object.entries(VoicePacks).map(([k, v]) => [v, k])
);

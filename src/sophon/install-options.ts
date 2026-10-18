import type { OperationParameters, SophonRpcClient } from "@sophon-rpc";

export interface InstallSelection {
  mode: "full" | "base";
  voicePacks: string[];
}

interface BranchCategory {
  type: string;
  matching_field: string;
  scenarios: string[];
}

export async function getInstallOptions(
  client: SophonRpcClient,
  params: Pick<OperationParameters, "game" | "cn">
) {
  const [configs, branches, build] = await Promise.all([
    client.call<{
      launch_configs: {
        enable_scenario_pkg: boolean;
        scenario_pkg_info?: {
          full_pkg_desc: string;
          base_pkg_desc: string;
        } | null;
      }[];
    }>("api.configs", params),
    client.call<{
      game_branches: { main: { tag: string; categories: BranchCategory[] } }[];
    }>("api.branches", params),
    client.call<{
      tag: string;
      manifests: {
        matching_field: string;
        stats: { uncompressed_size: number };
      }[];
    }>("api.sophonBuild", params),
  ]);
  const branch = branches.game_branches[0]?.main;
  if (!branch || build.tag !== branch.tag)
    throw new Error("Game information changed. Please try again.");

  const fields = (type: string, scenario?: string) => [
    ...new Set(
      branch.categories
        .filter(
          category =>
            category.type === type &&
            (!scenario || category.scenarios.includes(scenario))
        )
        .map(category => category.matching_field)
    ),
  ];
  const size = (field: string) => {
    const bytes = build.manifests.find(
      manifest => manifest.matching_field === field
    )?.stats.uncompressed_size;
    if (bytes === undefined || !Number.isSafeInteger(bytes) || bytes < 0)
      throw new Error(`Installation size is unavailable for ${field}.`);
    return bytes;
  };
  const modes = (["full", "base"] as const).flatMap(mode => {
    const resources = fields(
      "CATEGORY_TYPE_RESOURCE",
      `CATEGORY_SCENARIO_${mode.toUpperCase()}`
    );
    if (
      !resources.length ||
      (mode === "base" && !configs.launch_configs[0]?.enable_scenario_pkg)
    )
      return [];
    return [
      {
        mode,
        label: mode === "full" ? "Full install" : "Base install",
        description:
          configs.launch_configs[0]?.scenario_pkg_info?.[
            mode === "full" ? "full_pkg_desc" : "base_pkg_desc"
          ]?.trim(),
        size: resources.reduce((total, field) => total + size(field), 0),
      },
    ];
  });
  if (!modes.some(option => option.mode === "full"))
    throw new Error("No full installation is available for this game.");
  const names: Record<string, string> = {
    "en-us": "English",
    "ja-jp": "Japanese",
    "ko-kr": "Korean",
    "zh-cn": "Chinese",
  };
  return {
    modes,
    voicePacks: fields("CATEGORY_TYPE_AUDIO").map(id => ({
      id,
      label: names[id] ?? id,
      size: size(id),
    })),
  };
}

import type { JSXElement } from "solid-js";
import type { ChannelClient } from "../channel-client";
import type { CreateClientOptions } from "./shared";
import {
  createClient as createHK4EOSClient,
  UPDATE_UI_IMAGE as HK4EOS_IMAGE,
} from "./hk4eos";
import {
  createClient as createHK4ECNClient,
  UPDATE_UI_IMAGE as HK4ECN_IMAGE,
} from "./hk4ecn";
import {
  createClient as createHKRPGOSClient,
  UPDATE_UI_IMAGE as HKRPGOS_IMAGE,
} from "./hkrpgos";
import {
  createClient as createHKRPGCNClient,
  UPDATE_UI_IMAGE as HKRPGCN_IMAGE,
} from "./hkrpgcn";
import {
  createClient as createNAPOSClient,
  UPDATE_UI_IMAGE as NAPOS_IMAGE,
} from "./napos";
import {
  createClient as createNAPCNClient,
  UPDATE_UI_IMAGE as NAPCN_IMAGE,
} from "./napcn";

export type GameId =
  | "hk4eos"
  | "hk4ecn"
  | "hkrpgos"
  | "hkrpgcn"
  | "napos"
  | "napcn";

export interface GameDefinition {
  id: GameId;
  groupId: string;
  title: string;
  shortTitle: string;
  variantLabel: string;
  icon: string;
  createClient(options: CreateClientOptions): Promise<ChannelClient>;
}

export const GAME_REGISTRY: GameDefinition[] = [
  {
    id: "hk4eos",
    groupId: "hk4e",
    title: "Genshin Impact OS",
    shortTitle: "GI",
    variantLabel: "Global",
    icon: HK4EOS_IMAGE,
    createClient: createHK4EOSClient,
  },
  {
    id: "hk4ecn",
    groupId: "hk4e",
    title: "Genshin Impact CN",
    shortTitle: "GI",
    variantLabel: "China",
    icon: HK4ECN_IMAGE,
    createClient: createHK4ECNClient,
  },
  {
    id: "hkrpgos",
    groupId: "hkrpg",
    title: "Honkai: Star Rail OS",
    shortTitle: "HSR",
    variantLabel: "Global",
    icon: HKRPGOS_IMAGE,
    createClient: createHKRPGOSClient,
  },
  {
    id: "hkrpgcn",
    groupId: "hkrpg",
    title: "Honkai: Star Rail CN",
    shortTitle: "HSR",
    variantLabel: "China",
    icon: HKRPGCN_IMAGE,
    createClient: createHKRPGCNClient,
  },
  {
    id: "napos",
    groupId: "nap",
    title: "Zenless Zone Zero OS",
    shortTitle: "ZZZ",
    variantLabel: "Global",
    icon: NAPOS_IMAGE,
    createClient: createNAPOSClient,
  },
  {
    id: "napcn",
    groupId: "nap",
    title: "Zenless Zone Zero CN",
    shortTitle: "ZZZ",
    variantLabel: "China",
    icon: NAPCN_IMAGE,
    createClient: createNAPCNClient,
  },
];

export interface GameGroup {
  id: string;
  title: string;
  shortTitle: string;
  icon: string;
  variants: GameDefinition[];
}

export const GAME_GROUPS: GameGroup[] = [
  {
    id: "hk4e",
    title: "Genshin Impact",
    shortTitle: "GI",
    icon: HK4EOS_IMAGE,
    variants: GAME_REGISTRY.filter(game => game.groupId == "hk4e"),
  },
  {
    id: "hkrpg",
    title: "Honkai: Star Rail",
    shortTitle: "HSR",
    icon: HKRPGOS_IMAGE,
    variants: GAME_REGISTRY.filter(game => game.groupId == "hkrpg"),
  },
  {
    id: "nap",
    title: "Zenless Zone Zero",
    shortTitle: "ZZZ",
    icon: NAPOS_IMAGE,
    variants: GAME_REGISTRY.filter(game => game.groupId == "nap"),
  },
];

export function getGameById(id: string | null | undefined) {
  return GAME_REGISTRY.find(game => game.id == id) ?? GAME_REGISTRY[0];
}

export function getGroupById(id: string | null | undefined) {
  return GAME_GROUPS.find(group => group.id == id) ?? GAME_GROUPS[0];
}

export type LauncherFactory = () => JSXElement;

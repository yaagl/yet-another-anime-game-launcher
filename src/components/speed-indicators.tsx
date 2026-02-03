/**
 * Speed indicator icons and components for download/transfer metrics
 * Implements network download speed, disk write speed, and bottleneck indicators
 * Styled with Genshin Impact aesthetic: golden gradients, glows, and smooth animations
 */

import { Component } from "solid-js";

/**
 * Speed Indicator Component
 * Displays network and disk speed metrics side by side with warning indicator
 * Uses Genshin Impact aesthetic with golden accents and smooth styling
 */
export interface SpeedIndicatorProps {
  networkSpeed: string;
  diskSpeed: string;
  isDiskBottleneck?: boolean;
  class?: string;
  iconSize?: "sm" | "md" | "lg";
}

const iconSizeClasses = {
  sm: "w-4 h-4",
  md: "w-5 h-5",
  lg: "w-6 h-6",
};

export const SpeedIndicator: Component<SpeedIndicatorProps> = (props) => {
  const sizeClass = iconSizeClasses[props.iconSize || "md"];

  return (
    <div
      class={`flex items-center gap-4 px-4 py-3 rounded-lg backdrop-blur-sm transition-all duration-300 ${
        props.isDiskBottleneck
          ? "bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-400/40 shadow-lg shadow-yellow-500/20"
          : "bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-400/40 shadow-lg shadow-blue-500/20"
      } ${props.class || ""}`}
      title={
        props.isDiskBottleneck
          ? "Disk write speed is limiting performance"
          : "Network download speed is the limiting factor"
      }
      style={{
        "backdrop-filter": "blur(10px)",
      }}
    >
      {/* Network Download Speed */}
      <div class="flex items-center gap-2.5 group">
        <div class="relative">
          <div class="absolute inset-0 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full blur opacity-60 group-hover:opacity-100 transition-all duration-500 animate-pulse"></div>
          <div class="relative bg-gradient-to-br from-blue-500 to-cyan-600 rounded-full p-1.5 shadow-lg shadow-blue-500/50">
            <svg
              class={`${sizeClass} text-white relative z-10`}
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M3 3v8a2 2 0 002 2h14a2 2 0 002-2V3"
              />
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M7 12c0 1 1 2 2 2m8 0c1 0 2-1 2-2"
              />
              <circle cx="12" cy="20" r="1" fill="currentColor" />
            </svg>
          </div>
        </div>
        <div class="flex flex-col">
          <span class="text-xs font-bold text-blue-100 uppercase tracking-widest opacity-80">
            DL
          </span>
          <span class="text-sm font-bold text-white">{props.networkSpeed}</span>
        </div>
      </div>

      {/* Disk Write Speed */}
      <div class="flex items-center gap-2.5 group">
        <div class="relative">
          <div class="absolute inset-0 bg-gradient-to-r from-emerald-400 to-green-400 rounded-full blur opacity-60 group-hover:opacity-100 transition-all duration-500 animate-pulse"></div>
          <div class="relative bg-gradient-to-br from-emerald-500 to-green-600 rounded-full p-1.5 shadow-lg shadow-emerald-500/50">
            <svg
              class={`${sizeClass} text-white relative z-10`}
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
              <path
                d="M13 12h-2v4h2v-4zm-2-4h2V7h-2v1z"
                fill="white"
              />
            </svg>
          </div>
        </div>
        <div class="flex flex-col">
          <span class="text-xs font-bold text-emerald-100 uppercase tracking-widest opacity-80">
            Disk
          </span>
          <span class="text-sm font-bold text-white">{props.diskSpeed}</span>
        </div>
      </div>

      {/* Bottleneck Warning */}
      {props.isDiskBottleneck && (
        <div class="flex items-center gap-2 ml-1 px-3 py-2 rounded-lg bg-gradient-to-r from-yellow-500/50 to-amber-500/50 border border-yellow-300/60 animate-pulse shadow-lg shadow-yellow-500/30">
          <div class="relative">
            <div class="absolute inset-0 bg-gradient-to-r from-yellow-300 to-amber-300 rounded-full blur opacity-70"></div>
            <svg
              class={`${sizeClass} text-yellow-100 relative z-10`}
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
            </svg>
          </div>
          <span class="text-xs font-bold text-yellow-50 uppercase tracking-wider">
            Bottleneck
          </span>
        </div>
      )}
    </div>
  );
};

/**
 * Icon exports for direct use
 */
export const IconNetworkSpeed = (props: any) => {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M6 4c0 3 1 6 3 8m6-8c0 3-1 6-3 8m-6 2c0 3 2 6 5 7m8-7c0 3-2 6-5 7m-2-9h12a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2v-6a2 2 0 012-2z"
      />
    </svg>
  );
};

export const IconDiskSpeed = (props: any) => {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9H13V6.5h-2V11H6.5v2h4.5v4.5h2V13h4.5v-2z"
      />
    </svg>
  );
};

export const IconBottleneck = (props: any) => {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M12 9v2m0 4v2m0 4v2M7.08 6.47c.39-.39 1.02-.39 1.41 0l1.41 1.41c.39.39.39 1.02 0 1.41L8.5 10.5h7l-1.4-1.41c-.39-.39-.39-1.02 0-1.41l1.41-1.41c.39-.39 1.02-.39 1.41 0"
      />
    </svg>
  );
};

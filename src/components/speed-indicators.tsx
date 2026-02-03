/**
 * Speed indicator icons and components for download/transfer metrics
 * Implements network download speed, disk write speed, and bottleneck indicators
 */

import { Component, JSX } from "solid-js";

/**
 * Network Download Speed Icon
 * Represents incoming network data flow
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

/**
 * Disk Write Speed Icon
 * Represents data being written to storage
 */
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

/**
 * Bottleneck Warning Icon
 * Indicates disk I/O is the limiting factor
 */
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

/**
 * Speed Indicator Component
 * Displays network and disk speed metrics side by side with warning indicator
 */
export interface SpeedIndicatorProps {
  networkSpeed: string; // e.g., "50 MB/s"
  diskSpeed: string; // e.g., "10 MB/s"
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
      class={`flex items-center gap-3 ${props.class || ""}`}
      title={
        props.isDiskBottleneck
          ? "Disk speed is limiting performance"
          : "Network speed is limiting download"
      }
    >
      {/* Network Speed Indicator */}
      <div class="flex items-center gap-1">
        <IconNetworkSpeed class={`${sizeClass} text-blue-500`} />
        <span class="text-sm font-medium">{props.networkSpeed}</span>
      </div>

      {/* Disk Speed Indicator */}
      <div class="flex items-center gap-1">
        <IconDiskSpeed class={`${sizeClass} text-green-500`} />
        <span class="text-sm font-medium">{props.diskSpeed}</span>
      </div>

      {/* Bottleneck Warning (if applicable) */}
      {props.isDiskBottleneck && (
        <div class="flex items-center gap-1 ml-1 px-2 py-1 bg-yellow-50 rounded">
          <IconBottleneck class={`${sizeClass} text-yellow-600`} />
          <span class="text-xs font-semibold text-yellow-700">Bottleneck</span>
        </div>
      )}
    </div>
  );
};

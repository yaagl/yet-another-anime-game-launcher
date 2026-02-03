import { Button as KobalteButton } from "@kobalte/core/button";
import { Checkbox as KobalteCheckbox } from "@kobalte/core/checkbox";
import { Progress as KobalteProgress } from "@kobalte/core/progress";
import { Toast as KobalteToast, toaster as kobalteToaster } from "@kobalte/core/toast";
import { Component, JSX, splitProps } from "solid-js";

// Re-export Kobalte components directly
export { Select } from "@kobalte/core/select";
export { Alert } from "@kobalte/core/alert";
export { Tabs } from "@kobalte/core/tabs";
export { Dialog } from "@kobalte/core/dialog";
export { Popover } from "@kobalte/core/popover";
export { Toast, toaster } from "@kobalte/core/toast";

// Box component (simple div wrapper with className support)
export const Box: Component<
  JSX.HTMLAttributes<HTMLDivElement> & {
    height?: number | string;
    width?: number | string;
    h?: string;
    w?: string;
  }
> = props => {
  const [local, others] = splitProps(props, ["height", "width", "h", "w"]);
  const h = local.height ?? local.h;
  const w = local.width ?? local.w;
  const height = typeof h === "number" ? `${h}px` : h;
  const width = typeof w === "number" ? `${w}px` : w;
  return <div style={{ height, width }} {...others} />;
};

// VStack component (vertical stack)
export const VStack: Component<
  JSX.HTMLAttributes<HTMLDivElement> & {
    spacing?: string;
    alignItems?: string;
    w?: string;
  }
> = props => {
  const [local, others] = splitProps(props, [
    "spacing",
    "alignItems",
    "w",
    "class",
  ]);
  const spacing = local.spacing || "$4";
  const gap = spacing.replace("$", "");
  return (
    <div
      class={`flex flex-col ${local.class || ""}`}
      style={{
        gap: `${Number(gap) * 0.25}rem`,
        "align-items": local.alignItems,
        width: local.w,
      }}
      {...others}
    />
  );
};

// HStack component (horizontal stack)
export const HStack: Component<
  JSX.HTMLAttributes<HTMLDivElement> & {
    spacing?: string;
    alignItems?: string;
  }
> = props => {
  const [local, others] = splitProps(props, ["spacing", "alignItems", "class"]);
  const spacing = local.spacing || "$4";
  const gap = spacing.replace("$", "");
  return (
    <div
      class={`flex flex-row ${local.class || ""}`}
      style={{
        gap: `${Number(gap) * 0.25}rem`,
        "align-items": local.alignItems,
        ...others.style as JSX.CSSProperties,
      }}
      {...others}
    />
  );
};

// Center component
export const Center: Component<
  JSX.HTMLAttributes<HTMLDivElement> & {
    h?: string;
    w?: string;
  }
> = props => {
  const [local, others] = splitProps(props, ["h", "w", "class"]);
  return (
    <div
      class={`flex items-center justify-center ${local.class || ""}`}
      style={{
        height: local.h,
        width: local.w,
        ...others.style as JSX.CSSProperties,
      }}
      {...others}
    />
  );
};

// Image component
export const Image: Component<
  JSX.ImgHTMLAttributes<HTMLImageElement> & {
    boxSize?: number;
  }
> = props => {
  const [local, others] = splitProps(props, ["boxSize", "class"]);
  return (
    <img
      class={local.class}
      style={{
        width: local.boxSize ? `${local.boxSize}px` : undefined,
        height: local.boxSize ? `${local.boxSize}px` : undefined,
        ...others.style as JSX.CSSProperties,
      }}
      {...others}
    />
  );
};

// Button component
export const Button: Component<
  {
    variant?: "contained" | "outlined" | "text";
    size?: "sm" | "md" | "lg" | "xl";
    onClick?: (e?: any) => void;
    disabled?: boolean;
    children?: JSX.Element;
  } & Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, "onClick">
> = props => {
  const [local, others] = splitProps(props, [
    "variant",
    "size",
    "class",
    "children",
    "onClick",
  ]);
  const variantClasses = {
    contained: "bg-primary-600 hover:bg-primary-700 text-white",
    outlined:
      "border-2 border-primary-600 text-primary-600 hover:bg-primary-50",
    text: "text-primary-600 hover:bg-primary-50",
  };
  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg",
    xl: "px-8 py-4 text-xl",
  };
  return (
    <KobalteButton
      class={`rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
        variantClasses[local.variant || "contained"]
      } ${sizeClasses[local.size || "md"]} ${local.class || ""}`}
      onClick={local.onClick}
      {...others}
    >
      {local.children}
    </KobalteButton>
  );
};

// IconButton component
export const IconButton: Component<
  {
    onClick?: (e?: any) => void;
    disabled?: boolean;
    icon: JSX.Element;
    "aria-label": string;
    size?: "sm" | "md" | "lg" | "xl";
  } & Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, "onClick">
> = props => {
  const [local, others] = splitProps(props, [
    "icon",
    "size",
    "class",
    "onClick",
    "aria-label",
  ]);
  const sizeClasses = {
    sm: "w-8 h-8 text-sm",
    md: "w-10 h-10 text-base",
    lg: "w-12 h-12 text-lg",
    xl: "w-14 h-14 text-xl",
  };
  return (
    <KobalteButton
      aria-label={local["aria-label"]}
      class={`inline-flex items-center justify-center rounded bg-primary-600 hover:bg-primary-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
        sizeClasses[local.size || "md"]
      } ${local.class || ""}`}
      onClick={local.onClick}
      {...others}
    >
      {local.icon}
    </KobalteButton>
  );
};

// ButtonGroup component
export const ButtonGroup: Component<
  JSX.HTMLAttributes<HTMLDivElement> & {
    size?: "sm" | "md" | "lg" | "xl";
    attached?: boolean;
  }
> = props => {
  const [local, others] = splitProps(props, ["attached", "size", "class", "children"]);
  return (
    <div
      class={`inline-flex ${local.attached ? "-space-x-px" : "gap-2"} ${local.class || ""}`}
      {...others}
    >
      {local.children}
    </div>
  );
};

// Progress component
export const Progress: Component<{
  value?: number;
  indeterminate?: boolean;
  children?: JSX.Element;
  class?: string;
  size?: string;
  borderRadius?: number;
}> = props => {
  const [local, others] = splitProps(props, [
    "value",
    "indeterminate",
    "children",
    "class",
    "size",
    "borderRadius",
  ]);
  return (
    <KobalteProgress
      value={local.value}
      indeterminate={local.indeterminate}
      class={`w-full ${local.class || ""}`}
    >
      {local.children}
    </KobalteProgress>
  );
};

// ProgressIndicator component
export const ProgressIndicator: Component<{
  animated?: boolean;
  striped?: boolean;
  class?: string;
  style?: JSX.CSSProperties | string;
  borderRadius?: number;
}> = props => {
  const [local, others] = splitProps(props, ["animated", "striped", "class", "style", "borderRadius"]);
  const borderRadiusClass = local.borderRadius ? `rounded-[${local.borderRadius}px]` : "rounded";
  return (
    <KobalteProgress.Track class={`h-4 bg-gray-200 ${borderRadiusClass} overflow-hidden`}>
      <KobalteProgress.Fill
        class={`h-full bg-primary-600 ${local.style === "transition: none;" ? "" : "transition-all"} ${
          local.striped
            ? "bg-gradient-to-r from-primary-600 via-primary-500 to-primary-600 bg-[length:200%_100%]"
            : ""
        } ${
          local.animated ? "animate-[shimmer_2s_ease-in-out_infinite]" : ""
        } ${local.class || ""}`}
        style={typeof local.style === "string" ? local.style : local.style}
      />
    </KobalteProgress.Track>
  );
};

// Checkbox component
export const Checkbox: Component<{
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  children?: JSX.Element;
  size?: "sm" | "md" | "lg";
  class?: string;
}> = props => {
  const [local, others] = splitProps(props, [
    "checked",
    "onChange",
    "children",
    "size",
    "class",
  ]);
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };
  return (
    <KobalteCheckbox
      checked={local.checked}
      onChange={local.onChange}
      class={`flex items-center gap-2 ${local.class || ""}`}
      {...others}
    >
      <KobalteCheckbox.Input class="peer sr-only" />
      <KobalteCheckbox.Control
        class={`${
          sizeClasses[local.size || "md"]
        } border-2 border-gray-300 rounded flex items-center justify-center peer-focus:ring-2 peer-focus:ring-primary-600 peer-focus:ring-offset-2 ui-checked:bg-primary-600 ui-checked:border-primary-600`}
      >
        <KobalteCheckbox.Indicator>
          <svg
            class="w-3 h-3 text-white"
            fill="none"
            stroke-width="3"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </KobalteCheckbox.Indicator>
      </KobalteCheckbox.Control>
      <KobalteCheckbox.Label class="text-sm font-medium">
        {local.children}
      </KobalteCheckbox.Label>
    </KobalteCheckbox>
  );
};

// FormControl component
export const FormControl: Component<
  JSX.HTMLAttributes<HTMLDivElement> & {
    id?: string;
  }
> = props => {
  const [local, others] = splitProps(props, ["class"]);
  return <div class={`mb-4 ${local.class || ""}`} {...others} />;
};

// FormLabel component
export const FormLabel: Component<JSX.LabelHTMLAttributes<HTMLLabelElement>> =
  props => {
    const [local, others] = splitProps(props, ["class"]);
    return (
      <label
        class={`block text-sm font-medium text-gray-700 mb-2 ${
          local.class || ""
        }`}
        {...others}
      />
    );
  };

// Divider component
export const Divider: Component<
  JSX.HTMLAttributes<HTMLHRElement> & {
    orientation?: "horizontal" | "vertical";
  }
> = props => {
  const [local, others] = splitProps(props, ["orientation", "class"]);
  return (
    <hr
      class={`border-gray-300 ${
        local.orientation === "vertical" ? "border-l h-full" : "border-t w-full"
      } ${local.class || ""}`}
      {...others}
    />
  );
};

// Text component
export const Text: Component<JSX.HTMLAttributes<HTMLParagraphElement>> =
  props => {
    const [local, others] = splitProps(props, ["class"]);
    return <p class={`text-base ${local.class || ""}`} {...others} />;
  };

// Heading component
export const Heading: Component<
  JSX.HTMLAttributes<HTMLHeadingElement> & {
    size?: "xl" | "lg" | "md" | "sm";
    level?: "1" | "2" | "3" | "4" | "5" | "6";
    ml?: number | string;
    mb?: number | string;
    mt?: number | string;
    mr?: number | string;
  }
> = props => {
  const [local, others] = splitProps(props, ["size", "level", "ml", "mb", "mt", "mr", "class"]);
  const sizeClasses = {
    xl: "text-3xl",
    lg: "text-2xl",
    md: "text-xl",
    sm: "text-lg",
  };
  
  // Convert margin props to Tailwind classes
  const marginClass = [
    local.ml && (typeof local.ml === "number" ? `ml-[${local.ml}px]` : local.ml.replace("$", "ml-")),
    local.mb && (typeof local.mb === "number" ? `mb-[${local.mb}px]` : local.mb.replace("$", "mb-")),
    local.mt && (typeof local.mt === "number" ? `mt-[${local.mt}px]` : local.mt.replace("$", "mt-")),
    local.mr && (typeof local.mr === "number" ? `mr-[${local.mr}px]` : local.mr.replace("$", "mr-")),
  ].filter(Boolean).join(" ");
  
  const Tag = local.level ? (`h${local.level}` as any) : "h2";
  
  return (
    <Tag
      class={`font-bold ${sizeClasses[local.size || "lg"]} ${marginClass} ${
        local.class || ""
      }`}
      {...others}
    />
  );
};

// Input component
export const Input: Component<
  JSX.InputHTMLAttributes<HTMLInputElement>
> = props => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <input
      type="text"
      class={`px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:border-primary-500 ${local.class || ""}`}
      {...others}
    />
  );
};

// Notification service helper (compatible with Hope UI API)
export const notificationService = {
  show: (options: {
    status?: "info" | "success" | "warning" | "error";
    title: string;
    description?: string;
    duration?: number;
  }) => {
    return kobalteToaster.show((props: any) => (
      <KobalteToast toastId={props.toastId} duration={options.duration || 5000}>
        <div class={`p-4 rounded shadow-lg ${
          options.status === "success" ? "bg-green-100 text-green-800" :
          options.status === "error" ? "bg-red-100 text-red-800" :
          options.status === "warning" ? "bg-yellow-100 text-yellow-800" :
          "bg-blue-100 text-blue-800"
        }`}>
          <KobalteToast.Title class="font-semibold">{options.title}</KobalteToast.Title>
          {options.description && (
            <KobalteToast.Description class="text-sm mt-1">{options.description}</KobalteToast.Description>
          )}
        </div>
      </KobalteToast>
    ));
  },
};

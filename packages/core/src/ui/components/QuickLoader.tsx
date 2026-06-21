import type { JSX } from "preact";

interface QuickLoaderProps {
  className?: string;
  color?: "white" | "blue" | string;
}

const quickLoaderColors: Record<string, { color: string; track: string }> = {
  white: { color: "#fff", track: "rgba(255, 255, 255, 0.35)" },
  blue: { color: "#2563eb", track: "rgba(37, 99, 235, 0.2)" },
  teal: { color: "#2dd4bf", track: "rgba(45, 212, 191, 0.22)" }
};

function getColorStyle(color?: string): JSX.CSSProperties | undefined {
  if (!color) {
    return undefined;
  }

  const resolved = quickLoaderColors[color] ?? {
    color,
    track: `color-mix(in srgb, ${color} 24%, transparent)`
  };

  return {
    "--quick-loader-color": resolved.color,
    "--quick-loader-track": resolved.track
  } as JSX.CSSProperties;
}

export function QuickLoader({ className = "", color }: QuickLoaderProps) {
  return (
    <span class={`quick-loader ${className}`.trim()} style={getColorStyle(color)} aria-hidden="true">
      <span class="quick-loader__spinner" />
    </span>
  );
}

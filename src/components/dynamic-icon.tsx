import { icons, type LucideProps } from "lucide-react";

export type IconName = keyof typeof icons;
export const ICON_NAMES = Object.keys(icons) as IconName[];

/** Accepts "Sparkles", "sparkles" or "file-text" and returns the Lucide key, if it exists. */
export function resolveIconName(name: string | null | undefined): IconName | null {
  if (!name) return null;
  const trimmed = name.trim();
  if (trimmed in icons) return trimmed as IconName;
  const pascal = trimmed
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
  return pascal in icons ? (pascal as IconName) : null;
}

export function DynamicIcon({
  name,
  fallback = "Wrench",
  ...props
}: LucideProps & { name: string | null | undefined; fallback?: IconName }) {
  const Icon = icons[resolveIconName(name) ?? fallback];
  return <Icon {...props} />;
}

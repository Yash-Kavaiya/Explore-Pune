import { createElement } from "react";
import type { LucideProps } from "lucide-react";
import { getIcon } from "@/lib/icons";

/**
 * Renders a data-driven lucide icon by its string key.
 *
 * Call sites used to do `const Icon = getIcon(key)` and then render `<Icon />`,
 * which the react-hooks lint rules read as a component being created during
 * render. `getIcon` only ever hands back a stable component from a static map,
 * so resolving it through `createElement` keeps that identity unambiguous.
 */
export function Icon({ name, ...props }: LucideProps & { name: string }) {
  return createElement(getIcon(name), props);
}

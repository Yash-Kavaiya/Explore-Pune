"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

/** The "hydrated?" store never changes after mount, so it has nothing to emit. */
const subscribeToNothing = () => () => {};

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  // The resolved theme is only knowable on the client, so the first client
  // render has to match the server's. useSyncExternalStore gives us that
  // "have we hydrated yet" bit without a setState inside an effect.
  const mounted = React.useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {/* Render both and toggle with CSS-less swap to avoid hydration mismatch */}
      {mounted ? (
        isDark ? (
          <Sun className="size-5" />
        ) : (
          <Moon className="size-5" />
        )
      ) : (
        <Sun className="size-5 opacity-0" />
      )}
    </Button>
  );
}

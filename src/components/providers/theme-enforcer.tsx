"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";

/**
 * Sets a default theme on first visit only.
 * If the user already has a saved preference in localStorage, respects it.
 */
export function ThemeEnforcer({ defaultDark }: { defaultDark: boolean }) {
  const { setTheme } = useTheme();

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    if (!stored || stored === "system") {
      setTheme(defaultDark ? "dark" : "light");
    }
    // Intentionally runs only once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

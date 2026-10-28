"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon01 } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";

export function ThemeToggle({ size = "md", className = "" }) {
    const { theme, setTheme, resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <div className="size-9 rounded-lg border border-secondary bg-primary" />
        );
    }

    const currentTheme = theme || resolvedTheme || "dark";
    const isDark = currentTheme === "dark" || currentTheme === "dark-mode";

    const handleToggle = () => {
        setTheme(isDark ? "light" : "dark");
    };

    return (
        <Button
            size={size}
            color="secondary"
            iconLeading={isDark ? Sun : Moon01}
            onClick={handleToggle}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            className={className}
        />
    );
}


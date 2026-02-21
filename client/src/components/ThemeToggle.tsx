import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "./ui/button";

export function ThemeToggle() {
    const [theme, setTheme] = useState<"light" | "dark">("light");

    useEffect(() => {
        // Check local storage or system preference on mount
        const savedTheme = localStorage.getItem("theme");
        if (savedTheme === "dark" || (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
            setTheme("dark");
            document.documentElement.classList.add("dark");
        } else {
            setTheme("light");
            document.documentElement.classList.remove("dark");
        }
    }, []);

    const toggleTheme = () => {
        if (theme === "light") {
            setTheme("dark");
            document.documentElement.classList.add("dark");
            localStorage.setItem("theme", "dark");
        } else {
            setTheme("light");
            document.documentElement.classList.remove("dark");
            localStorage.setItem("theme", "light");
        }
    };

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="btn-neumorph-icon w-10 h-10 rounded-full hover:scale-110 active:scale-95 duration-200"
            title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
        >
            {theme === "light" ? (
                <Moon className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-gray-800" />
            ) : (
                <Sun className="h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-white" />
            )}
            <span className="sr-only">Toggle theme</span>
        </Button>
    );
}

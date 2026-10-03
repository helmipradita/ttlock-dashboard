import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/button";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 w-8 p-0 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
      onClick={toggleTheme}
      title={resolvedTheme === "dark" ? "Ganti ke Light mode" : "Ganti ke Dark mode"}
      aria-label="Toggle theme"
    >
      {resolvedTheme === "dark" ? (
        <Sun className="w-4 h-4 text-amber-300 transition-transform rotate-0 scale-100" />
      ) : (
        <Moon className="w-4 h-4 text-sky-200 transition-transform rotate-0 scale-100" />
      )}
    </Button>
  );
}

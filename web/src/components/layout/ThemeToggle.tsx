import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/button";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 w-8 p-0 text-foreground hover:bg-muted rounded-md transition-colors"
      onClick={toggleTheme}
      title={resolvedTheme === "dark" ? "Switch to Light theme" : "Switch to Dark theme"}
      aria-label="Toggle theme"
    >
      {resolvedTheme === "dark" ? (
        <Sun className="w-4 h-4 text-amber-400 transition-transform rotate-0 scale-100" />
      ) : (
        <Moon className="w-4 h-4 text-foreground transition-transform rotate-0 scale-100" />
      )}
    </Button>
  );
}

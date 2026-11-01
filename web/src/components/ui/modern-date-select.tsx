import { useState, useRef, useEffect } from "react";
import { Calendar as CalendarIcon, ChevronDown, Check } from "lucide-react";

interface Props {
  dates: string[];
  selectedDate: string;
  onChange: (date: string) => void;
  disabled?: boolean;
}

export function ModernDateSelect({
  dates,
  selectedDate,
  onChange,
  disabled = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative inline-block text-xs">
      <div
        role="button"
        tabIndex={0}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (!disabled) setOpen((prev) => !prev);
          }
        }}
        className={`h-[30px] px-2.5 rounded-md border text-xs flex items-center justify-between gap-2 cursor-pointer transition-colors shadow-2xs select-none ${
          disabled
            ? "opacity-50 pointer-events-none bg-muted/30 border-border"
            : open
              ? "border-primary ring-1 ring-primary/40 bg-background"
              : selectedDate
                ? "border-primary/60 bg-background text-foreground hover:border-primary"
                : "border-border bg-background hover:bg-muted/30 text-muted-foreground"
        }`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <CalendarIcon className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className={selectedDate ? "font-medium text-foreground" : "text-muted-foreground"}>
            {selectedDate || "-- Select Date --"}
          </span>
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform duration-150 ${
            open ? "rotate-180 text-primary" : ""
          }`}
        />
      </div>

      {open && (
        <div className="absolute left-0 top-[calc(100%+4px)] z-50 w-44 rounded-lg border border-border bg-popover text-popover-foreground shadow-lg animate-in fade-in-0 zoom-in-95 p-1 max-h-56 overflow-y-auto space-y-0.5">
          {dates.length === 0 ? (
            <p className="text-center py-2 text-xs text-muted-foreground">No dates available</p>
          ) : (
            dates.map((d) => {
              const isSelected = selectedDate === d;
              return (
                <div
                  key={d}
                  onClick={() => {
                    onChange(d);
                    setOpen(false);
                  }}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-md cursor-pointer text-xs font-mono transition-colors ${
                    isSelected
                      ? "bg-primary/10 text-primary font-medium"
                      : "hover:bg-muted/50 text-foreground"
                  }`}
                >
                  <span>{d}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

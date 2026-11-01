import { useState, useRef, useEffect, useMemo } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";

export interface GatewayOption {
  gatewayId: number;
  gatewayName: string | null;
}

interface Props {
  gateways: GatewayOption[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  disabled?: boolean;
}

export function GatewayMultiSelect({
  gateways,
  selectedIds,
  onChange,
  disabled = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close when clicking outside
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

  // Focus input when popover opens
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Defensive deduplication by gatewayId
  const uniqueGateways = useMemo(() => {
    const seen = new Set<number>();
    const list: GatewayOption[] = [];
    for (const gw of gateways) {
      const id = Number(gw.gatewayId);
      if (!isNaN(id) && !seen.has(id)) {
        seen.add(id);
        list.push({ gatewayId: id, gatewayName: gw.gatewayName });
      }
    }
    return list;
  }, [gateways]);

  // Filter based on search query
  const filteredGateways = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return uniqueGateways;
    return uniqueGateways.filter((gw) => {
      const name = (gw.gatewayName || "").toLowerCase();
      const idStr = String(gw.gatewayId);
      return name.includes(q) || idStr.includes(q);
    });
  }, [uniqueGateways, search]);

  const numericSelectedSet = useMemo(() => {
    return new Set(selectedIds.map(Number));
  }, [selectedIds]);

  const allFilteredSelected = useMemo(() => {
    return (
      filteredGateways.length > 0 &&
      filteredGateways.every((gw) => numericSelectedSet.has(gw.gatewayId))
    );
  }, [filteredGateways, numericSelectedSet]);

  function toggleGateway(id: number, e: React.MouseEvent) {
    e.stopPropagation();
    const numId = Number(id);
    if (numericSelectedSet.has(numId)) {
      onChange(selectedIds.map(Number).filter((item) => item !== numId));
    } else {
      onChange([...selectedIds.map(Number), numId]);
    }
  }

  function handleSelectAll(e: React.MouseEvent) {
    e.stopPropagation();
    if (allFilteredSelected) {
      const filteredIds = new Set(filteredGateways.map((g) => g.gatewayId));
      onChange(selectedIds.map(Number).filter((id) => !filteredIds.has(id)));
    } else {
      const combined = new Set([
        ...selectedIds.map(Number),
        ...filteredGateways.map((g) => g.gatewayId),
      ]);
      onChange(Array.from(combined));
    }
  }

  function handleRemove(id: number, e: React.MouseEvent) {
    e.stopPropagation();
    onChange(selectedIds.map(Number).filter((item) => item !== Number(id)));
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange([]);
  }

  return (
    <div ref={containerRef} className="relative inline-block text-xs">
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={`h-[30px] min-w-[220px] max-w-[380px] px-2.5 rounded-md border text-xs flex items-center justify-between gap-2 cursor-pointer transition-colors shadow-2xs select-none ${
          disabled
            ? "opacity-50 pointer-events-none bg-muted/30 border-border"
            : open
              ? "border-primary ring-1 ring-primary/40 bg-background"
              : selectedIds.length > 0
                ? "border-primary/60 bg-background text-foreground hover:border-primary"
                : "border-border bg-background hover:bg-muted/30 text-muted-foreground"
        }`}
      >
        <div className="flex items-center gap-1.5 min-w-0 truncate">
          {selectedIds.length === 0 ? (
            <span className="text-muted-foreground font-normal">-- Select Gateways --</span>
          ) : selectedIds.length <= 2 ? (
            <div className="flex items-center gap-1 truncate">
              {selectedIds.map((id) => {
                const gw = uniqueGateways.find((g) => g.gatewayId === Number(id));
                const label = gw?.gatewayName || `GW ${id}`;
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 text-[11px] font-medium"
                  >
                    <span className="truncate max-w-[110px]">{label}</span>
                    <span
                      role="button"
                      tabIndex={0}
                      className="hover:text-foreground cursor-pointer flex items-center"
                      onClick={(e) => handleRemove(id, e)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleRemove(id, e as any);
                        }
                      }}
                    >
                      <X className="w-3 h-3" />
                    </span>
                  </span>
                );
              })}
            </div>
          ) : (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 text-[11px] font-semibold">
              {selectedIds.length} Gateways selected
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 text-muted-foreground shrink-0 ml-auto">
          {selectedIds.length > 0 && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleClear(e as any);
                }
              }}
              className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Clear all selected"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-150 ${
              open ? "rotate-180 text-primary" : ""
            }`}
          />
        </div>
      </button>

      {/* Popover Panel */}
      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute left-0 top-[calc(100%+4px)] z-50 w-72 sm:w-80 rounded-lg border border-border bg-popover text-popover-foreground shadow-lg animate-in fade-in-0 zoom-in-95 p-2 space-y-2"
        >
          {/* Search Box */}
          <div className="relative flex items-center">
            <Search className="absolute left-2.5 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search gateway name or ID"
              className="w-full h-7 pl-8 pr-7 rounded-md border border-border bg-muted/30 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary focus:bg-background"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 text-muted-foreground hover:text-foreground p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex items-center justify-between px-1 text-[11px] text-muted-foreground border-b border-border/40 pb-1.5">
            <span>
              {selectedIds.length} of {uniqueGateways.length} selected
            </span>
            <button
              type="button"
              onClick={handleSelectAll}
              className="font-medium text-primary hover:underline cursor-pointer"
            >
              {allFilteredSelected ? "Deselect All" : "Select All"}
            </button>
          </div>

          {/* Gateways List */}
          <div className="max-h-56 overflow-y-auto space-y-0.5 pr-1">
            {filteredGateways.length === 0 ? (
              <p className="text-center py-4 text-xs text-muted-foreground">No gateways found</p>
            ) : (
              filteredGateways.map((gw) => {
                const isSelected = numericSelectedSet.has(gw.gatewayId);
                const name = gw.gatewayName || `Gateway ${gw.gatewayId}`;

                return (
                  <div
                    key={gw.gatewayId}
                    role="checkbox"
                    aria-checked={isSelected}
                    onClick={(e) => toggleGateway(gw.gatewayId, e)}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-md cursor-pointer text-xs select-none transition-colors ${
                      isSelected
                        ? "bg-primary/10 text-primary font-medium"
                        : "hover:bg-muted/50 text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <div
                        className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-border bg-background"
                        }`}
                      >
                        {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs leading-tight font-medium">{name}</p>
                        <p className="text-[10px] text-muted-foreground/80 font-mono">
                          ID: {gw.gatewayId}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

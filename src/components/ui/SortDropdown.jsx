import {
  ArrowDownAz,
  ArrowUpAz,
  ArrowUp10,
  ArrowDown10,
  CalendarClock,
  Sparkles,
  HeartPulse,
  Gem,
  Check,
  ChevronsUpDown,
} from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

const sortOptions = [
  {
    label: "Relevance",
    value: "",
    icon: <Sparkles className="w-4 h-4" />,
  },
  {
    label: "Release Date",
    isGroup: true,
  },
  {
    label: "Newest First",
    value: "-set.releaseDate",
    icon: <CalendarClock className="w-4 h-4" />,
  },
  {
    label: "Oldest First",
    value: "set.releaseDate",
    icon: <CalendarClock className="w-4 h-4" />,
  },
  {
    label: "Name",
    isGroup: true,
  },
  {
    label: "Name A-Z",
    value: "name",
    icon: <ArrowDownAz className="w-4 h-4" />,
  },
  {
    label: "Name Z-A",
    value: "-name",
    icon: <ArrowUpAz className="w-4 h-4" />,
  },
  {
    label: "Card Number",
    isGroup: true,
  },
  {
    label: "Number Asc",
    value: "number",
    icon: <ArrowUp10 className="w-4 h-4" />,
  },
  {
    label: "Number Desc",
    value: "-number",
    icon: <ArrowDown10 className="w-4 h-4" />,
  },
  {
    label: "Rarity",
    isGroup: true,
  },
  {
    label: "Rarity Asc",
    value: "rarity",
    icon: <Gem className="w-4 h-4" />,
  },
  {
    label: "Rarity Desc",
    value: "-rarity",
    icon: <Gem className="w-4 h-4" />,
  },
];

const SortDropdown = ({ value, onChange }) => {
  const selectedOption =
    sortOptions.find((opt) => !opt.isGroup && opt.value === value) ||
    sortOptions[0];

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="flex items-center justify-between gap-2 w-full sm:w-48 px-3 py-2 border border-border rounded-lg text-sm bg-card-background text-text-primary hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors">
          <div className="flex items-center gap-2">
            {selectedOption.icon}
            <span className="font-medium">{selectedOption.label}</span>
          </div>
          <ChevronsUpDown className="w-4 h-4 text-slate-400" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="w-56 bg-card-background rounded-lg shadow-lg border border-border p-1 z-[60]"
          sideOffset={5}
        >
          {sortOptions.map((option, index) => {
            if (option.isGroup) {
              return (
                <DropdownMenu.Group key={index}>
                  {index > 0 && (
                    <DropdownMenu.Separator className="h-px bg-border my-1" />
                  )}
                  <DropdownMenu.Label className="px-2 py-1.5 text-xs font-semibold text-text-secondary">
                    {option.label}
                  </DropdownMenu.Label>
                </DropdownMenu.Group>
              );
            }
            return (
              <DropdownMenu.Item
                key={option.value}
                onSelect={() => onChange(option.value)}
                className="flex items-center justify-between gap-2 px-2 py-1.5 text-sm text-text-primary rounded-md hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  {option.icon}
                  <span>{option.label}</span>
                </div>
                {value === option.value && <Check className="w-4 h-4" />}
              </DropdownMenu.Item>
            );
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};

export default SortDropdown;

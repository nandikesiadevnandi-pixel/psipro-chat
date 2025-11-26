import { Button } from "@/components/ui/button";

type FilterType = "all" | "unread";

interface QuickFilterPillsProps {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
}

const QuickFilterPills = ({ activeFilter, onFilterChange }: QuickFilterPillsProps) => {
  const filters: { value: FilterType; label: string }[] = [
    { value: "all", label: "Todas" },
    { value: "unread", label: "Não lidas" },
  ];

  return (
    <div className="flex gap-2">
      {filters.map((filter) => (
        <Button
          key={filter.value}
          variant={activeFilter === filter.value ? "default" : "outline"}
          size="sm"
          onClick={() => onFilterChange(filter.value)}
          className={`
            text-xs font-medium rounded-full transition-colors
            ${
              activeFilter === filter.value
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-sidebar-accent text-sidebar-foreground border-sidebar-border hover:bg-sidebar-accent/80"
            }
          `}
        >
          {filter.label}
        </Button>
      ))}
    </div>
  );
};

export default QuickFilterPills;

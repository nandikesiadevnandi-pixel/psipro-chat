import { Rocket } from "lucide-react";
import { useSetupProgress } from "@/hooks/useSetupProgress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SetupGuideSideTabProps {
  onClick: () => void;
}

export const SetupGuideSideTab = ({ onClick }: SetupGuideSideTabProps) => {
  const { totalProgress, remainingSteps } = useSetupProgress();

  // Hide when setup is 100% complete
  if (totalProgress === 100) {
    return null;
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        "fixed top-1/2 -right-[1px] z-50",
        "flex items-center gap-2 px-4 py-2.5",
        "bg-primary text-primary-foreground",
        "hover:bg-primary/90",
        "transition-all duration-200",
        "shadow-lg rounded-tl-lg rounded-bl-lg border-r-0",
        "origin-bottom-right",
        "-rotate-90 -translate-x-full translate-y-1/2"
      )}
      title={`${remainingSteps} passos restantes`}
    >
      <Rocket className="h-4 w-4" />
      <span className="font-medium text-sm whitespace-nowrap">
        Guia de Setup
      </span>
      <Badge 
        variant="secondary" 
        className="bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/20"
      >
        {remainingSteps}
      </Badge>
    </button>
  );
};

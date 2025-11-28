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
        "fixed right-0 top-1/2 -translate-y-1/2 z-50",
        "flex items-center gap-3 py-3 px-4",
        "bg-primary text-primary-foreground",
        "hover:bg-primary/90",
        "transition-all duration-200",
        "shadow-lg rounded-l-lg",
        "[writing-mode:vertical-rl]"
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

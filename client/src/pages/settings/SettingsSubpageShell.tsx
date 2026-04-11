import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export function SettingsSubpageShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  const [, setLocation] = useLocation();

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto w-full">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setLocation("/settings")}
          className="p-1.5 rounded-lg hover:bg-muted touch-manipulation shrink-0"
          aria-label="Back to settings"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <h1 className="text-xl font-bold leading-tight">{title}</h1>
          {description ? (
            <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
          ) : null}
        </div>
      </div>
      {children}
    </div>
  );
}

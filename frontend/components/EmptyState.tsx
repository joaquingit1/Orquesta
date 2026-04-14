import { Activity } from "lucide-react";
import { Card } from "./Card";

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Card className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-12 h-12 rounded-full bg-accent-soft grid place-items-center mb-4">
        <Activity className="w-5 h-5 text-accent" />
      </div>
      <div className="font-medium mb-1">{title}</div>
      <div className="text-sm text-fg-muted max-w-sm">{description}</div>
    </Card>
  );
}

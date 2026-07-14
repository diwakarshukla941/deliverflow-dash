import { Card, CardContent } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

export function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-orange-600">
          <Sparkles className="h-6 w-6" />
        </div>
        <h3 className="text-xl font-semibold">{title}</h3>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-semibold">Visual AI Workflow</h1>
      <p className="text-muted-foreground">Phase 1 — setup complete.</p>
      <Button>shadcn OK</Button>
    </div>
  );
}

import { Link } from "react-router";
import { Card, PageHeader } from "@niwa/ui/components";

export default function ExampleDemoPage() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans antialiased">
      <div className="mx-auto max-w-3xl px-5 py-10 space-y-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-[var(--shadow-card)] transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
        >
          <span aria-hidden="true">←</span>
          <span>Back to labs</span>
        </Link>
        <PageHeader
          kicker="NIWA / LABS"
          title="Example Demo"
          description="Minimal starter route using @niwa/ui tokens and components."
        />
        <Card title="Starter Surface">
          <p className="text-sm text-muted-foreground">
            Ready for new experiments.
          </p>
        </Card>
      </div>
    </div>
  );
}

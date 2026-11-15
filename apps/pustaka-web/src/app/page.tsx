import { BookOpen, Library, CheckCircle2 } from "lucide-react";
import { loginSchema } from "@niwa/pustaka-validators";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { API_BASE_URL } from "@/lib/api";

export default function HomePage() {
  const validatorReady = typeof loginSchema.safeParse === "function";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col justify-center px-6 py-12">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs">
          <Library className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pustaka Web App</h1>
          <p className="text-sm text-muted-foreground">
            Personal &amp; household mini-library and reading progress tracker
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BookOpen className="h-5 w-5" />
              Phase 1: Foundation Ready
            </CardTitle>
            <Badge variant="secondary" className="gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              Initialized
            </Badge>
          </div>
          <CardDescription>
            Next.js App Router, Tailwind CSS v4, shadcn/ui primitives, TanStack
            Query, and shared Zod schemas are linked and configured.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Project Setup Progress (Phase 1 / 5)</span>
              <span>20%</span>
            </div>
            <Progress value={20} />
          </div>

          <div className="grid gap-3 pt-2 text-sm sm:grid-cols-2">
            <div className="rounded-lg border bg-muted/40 p-3">
              <p className="text-xs font-medium text-muted-foreground">
                API Base URL
              </p>
              <p className="mt-1 font-mono text-xs">{API_BASE_URL}</p>
            </div>
            <div className="rounded-lg border bg-muted/40 p-3">
              <p className="text-xs font-medium text-muted-foreground">
                Shared Validators (@niwa/pustaka-validators)
              </p>
              <p className="mt-1 font-mono text-xs">
                {validatorReady ? "Connected (Zod v4)" : "Not linked"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

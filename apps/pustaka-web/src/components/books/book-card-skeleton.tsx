import { Card, CardContent, Skeleton } from "@niwa/ui/primitives";
export function BookCardSkeleton() {
  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <div className="p-3 pb-0">
        <Skeleton className="aspect-[2/3] w-full rounded-lg" />
      </div>
      <CardContent className="space-y-3 p-4">
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-3 w-3/5" />
        </div>
        <div className="space-y-1.5 border-t pt-2.5">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      </CardContent>
    </Card>
  );
}

export function BookGridSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {Array.from({ length: count }).map((_, idx) => (
        <BookCardSkeleton key={idx} />
      ))}
    </div>
  );
}

export function BookRowSkeleton({ count = 2 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, idx) => (
        <Card key={idx}>
          <CardContent className="flex items-center gap-4 p-4">
            <Skeleton className="h-24 w-16 shrink-0 rounded-md" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="mt-2 h-2 w-full rounded-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  updateReadingProgressSchema,
  type UpdateReadingProgressInput,
} from "@niwa/pustaka-validators";
import { Edit3, Loader2 } from "lucide-react";
import type { ReadingListItem, ReadingProgress } from "@/types/api";
import { ApiError, apiClient } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { BookCover } from "@/components/books/book-cover";
import { READING_STATUS_LABELS } from "@/components/books/book-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

export interface ReadingListBookRowProps {
  item: ReadingListItem;
}

export function ReadingListBookRow({ item }: ReadingListBookRowProps) {
  const { book } = item;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const progressQuery = useQuery({
    queryKey: ["reading-progress", book.id],
    queryFn: () =>
      apiClient.get<{ progress: ReadingProgress }>(
        `/api/v1/me/progress/${book.id}`
      ),
  });

  const lastPageRead = progressQuery.data?.progress.last_page_read ?? 0;
  const totalPages = book.total_pages || 1;
  const percentage = Math.min(
    100,
    Math.round((lastPageRead / totalPages) * 100)
  );

  const form = useForm<UpdateReadingProgressInput>({
    resolver: zodResolver(updateReadingProgressSchema),
    defaultValues: {
      last_page_read: lastPageRead,
    },
  });

  React.useEffect(() => {
    form.reset({ last_page_read: lastPageRead });
  }, [form, lastPageRead]);

  const updateProgressMutation = useMutation({
    mutationFn: (values: UpdateReadingProgressInput) =>
      apiClient.put<{ progress: ReadingProgress }>(
        `/api/v1/me/progress/${book.id}`,
        values
      ),
    onMutate: async (values) => {
      await queryClient.cancelQueries({
        queryKey: ["reading-progress", book.id],
      });
      const previous = queryClient.getQueryData<{ progress: ReadingProgress }>([
        "reading-progress",
        book.id,
      ]);

      const nextPct = Math.min(
        100,
        Math.round((values.last_page_read / totalPages) * 100)
      );
      queryClient.setQueryData(["reading-progress", book.id], {
        progress: {
          id: previous?.progress.id ?? "temp",
          user_id: previous?.progress.user_id ?? "me",
          book_id: book.id,
          last_page_read: values.last_page_read,
          total_pages: book.total_pages,
          percentage: nextPct,
          updated_at: Math.floor(Date.now() / 1000),
        },
      });

      return { previous };
    },
    onError: (err, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          ["reading-progress", book.id],
          context.previous
        );
      }
      toast({
        variant: "destructive",
        title: "Could not update progress",
        description:
          err instanceof ApiError ? err.message : "Please try again.",
      });
    },
    onSuccess: (data) => {
      setDialogOpen(false);
      toast({
        title: "Progress updated",
        description: `"${book.title}" — page ${data.progress.last_page_read} of ${book.total_pages} (${data.progress.percentage}%).`,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["reading-progress", book.id],
      });
    },
  });

  function onSubmit(values: UpdateReadingProgressInput) {
    if (values.last_page_read > book.total_pages) {
      form.setError("last_page_read", {
        type: "manual",
        message: `Page cannot exceed ${book.total_pages}`,
      });
      return;
    }
    updateProgressMutation.mutate(values);
  }

  return (
    <Card className="transition-colors hover:border-primary/30">
      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
        <Link href={`/books/${book.id}`} className="flex items-center gap-4 flex-1 min-w-0">
          <BookCover
            bookId={book.id}
            title={book.title}
            coverImageKey={book.cover_image_key}
            className="h-24 w-16 shrink-0 rounded-md"
            iconClassName="h-5 w-5"
          />
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate font-serif text-base font-medium text-foreground hover:underline">
                {book.title}
              </h3>
              <Badge variant="secondary" className="text-[11px]">
                {READING_STATUS_LABELS[item.status]}
              </Badge>
            </div>
            <p className="truncate text-xs text-muted-foreground">
              {book.author}
            </p>
            <div className="space-y-1.5 pt-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Page {lastPageRead} of {book.total_pages}
                </span>
                <span className="font-semibold text-foreground">
                  {percentage}%
                </span>
              </div>
              <Progress value={percentage} />
            </div>
          </div>
        </Link>

        <div className="flex items-center justify-end gap-2 sm:shrink-0">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Edit3 className="h-3.5 w-3.5" />
                Update Page
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Update Page Progress</DialogTitle>
                <DialogDescription>
                  Update your current page for &ldquo;{book.title}&rdquo;.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="last_page_read"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Page Read</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            max={book.total_pages}
                            value={field.value}
                            onChange={(e) =>
                              field.onChange(
                                e.target.value === ""
                                  ? 0
                                  : Number(e.target.value)
                              )
                            }
                          />
                        </FormControl>
                        <FormDescription>
                          0 to {book.total_pages} pages
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button
                      type="submit"
                      disabled={updateProgressMutation.isPending}
                    >
                      {updateProgressMutation.isPending && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                      Save Progress
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}

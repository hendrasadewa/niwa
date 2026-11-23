"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  updateReadingProgressSchema,
  type ReadingStatus,
  type UpdateReadingProgressInput,
} from "@niwa/pustaka-validators";
import { BookMarked, CheckCircle2, Edit3, Loader2, Plus } from "lucide-react";
import type { Book, ReadingListItem, ReadingProgress } from "@/types/api";
import { ApiError, apiClient } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { READING_STATUS_LABELS } from "@/components/books/book-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

export interface ReadingProgressCardProps {
  book: Book;
}

export function ReadingProgressCard({ book }: ReadingProgressCardProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const readingListQuery = useQuery({
    queryKey: ["reading-list"],
    queryFn: () =>
      apiClient.get<{ reading_list: ReadingListItem[] }>(
        "/api/v1/me/reading-list"
      ),
  });

  const progressQuery = useQuery({
    queryKey: ["reading-progress", book.id],
    queryFn: () =>
      apiClient.get<{ progress: ReadingProgress }>(
        `/api/v1/me/progress/${book.id}`
      ),
  });

  const currentListItem = React.useMemo(
    () =>
      readingListQuery.data?.reading_list.find(
        (item) => item.book_id === book.id
      ) ?? null,
    [book.id, readingListQuery.data]
  );

  const progress = progressQuery.data?.progress;
  const lastPageRead = progress?.last_page_read ?? 0;
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

  const addToReadingListMutation = useMutation({
    mutationFn: (status: ReadingStatus) =>
      apiClient.post<{ reading_list_item: ReadingListItem }>(
        "/api/v1/me/reading-list",
        {
          book_id: book.id,
          status,
        }
      ),
    onMutate: async (status) => {
      await queryClient.cancelQueries({ queryKey: ["reading-list"] });
      const previous = queryClient.getQueryData<{
        reading_list: ReadingListItem[];
      }>(["reading-list"]);

      if (previous) {
        const optimisticItem: ReadingListItem = {
          id: `temp-${book.id}`,
          user_id: "me",
          book_id: book.id,
          status,
          updated_at: Math.floor(Date.now() / 1000),
          book,
        };
        queryClient.setQueryData(["reading-list"], {
          reading_list: [...previous.reading_list, optimisticItem],
        });
      }

      return { previous };
    },
    onError: (err, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["reading-list"], context.previous);
      }
      toast({
        variant: "destructive",
        title: "Failed to add to reading list",
        description:
          err instanceof ApiError ? err.message : "Please try again.",
      });
    },
    onSuccess: (_data, status) => {
      toast({
        title: "Added to Reading List",
        description: `"${book.title}" marked as ${READING_STATUS_LABELS[status]}.`,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["reading-list"] });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: (status: ReadingStatus) =>
      apiClient.patch<{ reading_list_item: ReadingListItem }>(
        `/api/v1/me/reading-list/${book.id}`,
        { status }
      ),
    onMutate: async (status) => {
      await queryClient.cancelQueries({ queryKey: ["reading-list"] });
      const previous = queryClient.getQueryData<{
        reading_list: ReadingListItem[];
      }>(["reading-list"]);

      if (previous) {
        queryClient.setQueryData(["reading-list"], {
          reading_list: previous.reading_list.map((item) =>
            item.book_id === book.id ? { ...item, status } : item
          ),
        });
      }

      return { previous };
    },
    onError: (err, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["reading-list"], context.previous);
      }
      toast({
        variant: "destructive",
        title: "Failed to update status",
        description:
          err instanceof ApiError ? err.message : "Please try again.",
      });
    },
    onSuccess: (_data, status) => {
      toast({
        title: "Reading status updated",
        description: `"${book.title}" is now ${READING_STATUS_LABELS[status]}.`,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["reading-list"] });
    },
  });

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
        title: "Could not update page progress",
        description:
          err instanceof ApiError ? err.message : "Please check the page number.",
      });
    },
    onSuccess: (data) => {
      setDialogOpen(false);
      toast({
        title: "Reading progress saved",
        description: `Page ${data.progress.last_page_read} of ${book.total_pages} (${data.progress.percentage}%).`,
      });
      if (
        data.progress.last_page_read === book.total_pages &&
        currentListItem &&
        currentListItem.status !== "completed"
      ) {
        updateStatusMutation.mutate("completed");
      } else if (
        data.progress.last_page_read > 0 &&
        !currentListItem
      ) {
        addToReadingListMutation.mutate("reading");
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["reading-progress", book.id],
      });
    },
  });

  function onSubmitProgress(values: UpdateReadingProgressInput) {
    if (values.last_page_read > book.total_pages) {
      form.setError("last_page_read", {
        type: "manual",
        message: `Page cannot exceed total pages (${book.total_pages})`,
      });
      return;
    }
    updateProgressMutation.mutate(values);
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <BookMarked className="h-4 w-4" />
              Your Reading Status &amp; Progress
            </CardTitle>
            <CardDescription>
              Track your shelf status and current page in this book.
            </CardDescription>
          </div>
          {percentage === 100 && (
            <span className="inline-flex items-center gap-1 rounded-full border border-success-border bg-success-soft px-2.5 py-1 text-xs font-medium text-success-foreground">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Finished
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">
              Reading List Status
            </p>
            {currentListItem ? (
              <Select
                value={currentListItem.status}
                onValueChange={(value) =>
                  updateStatusMutation.mutate(value as ReadingStatus)
                }
                disabled={updateStatusMutation.isPending}
              >
                <SelectTrigger className="w-full sm:w-52">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(
                    Object.entries(READING_STATUS_LABELS) as Array<
                      [ReadingStatus, string]
                    >
                  ).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => addToReadingListMutation.mutate("want_to_read")}
                  disabled={addToReadingListMutation.isPending}
                >
                  <Plus className="h-4 w-4" />
                  Want to Read
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => addToReadingListMutation.mutate("reading")}
                  disabled={addToReadingListMutation.isPending}
                >
                  Start Reading Now
                </Button>
              </div>
            )}
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="self-start sm:self-end">
                <Edit3 className="h-4 w-4" />
                Update Page Progress
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Update Reading Progress</DialogTitle>
                <DialogDescription>
                  Enter the last page you read in &ldquo;{book.title}&rdquo;.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmitProgress)}
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
                          Must be between 0 and {book.total_pages} pages.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() =>
                        form.setValue("last_page_read", book.total_pages)
                      }
                    >
                      Mark All {book.total_pages} Pages Read
                    </Button>
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

        <div className="space-y-2 rounded-lg border bg-muted/30 p-3.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium">
              Page {lastPageRead} of {book.total_pages}
            </span>
            <span className="font-semibold text-primary">{percentage}%</span>
          </div>
          <Progress value={percentage} />
        </div>
      </CardContent>
    </Card>
  );
}

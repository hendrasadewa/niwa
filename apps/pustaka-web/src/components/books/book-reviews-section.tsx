"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createReviewSchema,
  type CreateReviewInput,
} from "@niwa/pustaka-validators";
import { Loader2, LogIn, MessageSquarePlus, Star } from "lucide-react";
import type { BookReview } from "@/types/api";
import { ApiError, apiClient } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

export interface BookReviewsSectionProps {
  bookId: string;
}

export function BookReviewsSection({ bookId }: BookReviewsSectionProps) {
  const { user, isAuthenticated, loginWithSso } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [hoveredStar, setHoveredStar] = React.useState<number | null>(null);

  const reviewsQuery = useQuery({
    queryKey: ["book-reviews", bookId],
    queryFn: () =>
      apiClient.get<{ reviews: BookReview[] }>(
        `/api/v1/books/${bookId}/reviews`
      ),
  });

  const form = useForm<CreateReviewInput>({
    resolver: zodResolver(createReviewSchema),
    defaultValues: {
      rating: 5,
      review_text: "",
    },
  });

  const createReviewMutation = useMutation({
    mutationFn: (values: CreateReviewInput) =>
      apiClient.post<{ review: BookReview }>(
        `/api/v1/books/${bookId}/reviews`,
        values
      ),
    onMutate: async (values) => {
      await queryClient.cancelQueries({ queryKey: ["book-reviews", bookId] });
      const previous = queryClient.getQueryData<{ reviews: BookReview[] }>([
        "book-reviews",
        bookId,
      ]);

      if (previous) {
        const optimisticReview: BookReview = {
          id: `temp-${Date.now()}`,
          user_id: user?.id ?? "me",
          username: user?.username ?? "You",
          book_id: bookId,
          rating: values.rating,
          review_text: values.review_text,
        };
        queryClient.setQueryData(["book-reviews", bookId], {
          reviews: [optimisticReview, ...previous.reviews],
        });
      }

      return { previous };
    },
    onError: (err, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["book-reviews", bookId], context.previous);
      }
      toast({
        variant: "destructive",
        title: "Failed to post review",
        description:
          err instanceof ApiError ? err.message : "Please try again.",
      });
    },
    onSuccess: () => {
      form.reset({ rating: 5, review_text: "" });
      toast({
        title: "Review submitted!",
        description: "Thank you for sharing your thoughts with the household.",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["book-reviews", bookId] });
    },
  });

  const reviews = reviewsQuery.data?.reviews ?? [];
  const selectedRating = form.watch("rating");

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <Card className="lg:col-span-5 h-fit">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquarePlus className="h-4 w-4" />
            Leave a Rating &amp; Review
          </CardTitle>
          <CardDescription>
            Share your thoughts and rating with other household members.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isAuthenticated ? (
            <div className="space-y-3 rounded-[var(--radius-xl)] border border-dashed border-border bg-surface-muted/40 p-5 text-center">
              <p className="text-xs text-muted-foreground">
                Sign in with your Niwa account to rate this book and share a
                review with the household.
              </p>
              <Button
                size="sm"
                onClick={() =>
                  loginWithSso(
                    typeof window !== "undefined"
                      ? window.location.href
                      : undefined
                  )
                }
              >
                <LogIn className="h-3.5 w-3.5" />
                Sign in to Review
              </Button>
            </div>
          ) : (
            <Form {...form}>
            <form
              onSubmit={form.handleSubmit((values) =>
                createReviewMutation.mutate(values)
              )}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="rating"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rating (1–5 Stars)</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((starValue) => {
                          const active =
                            (hoveredStar ?? selectedRating) >= starValue;
                          return (
                            <button
                              key={starValue}
                              type="button"
                              onClick={() => field.onChange(starValue)}
                              onMouseEnter={() => setHoveredStar(starValue)}
                              onMouseLeave={() => setHoveredStar(null)}
                              className="rounded-sm p-1 transition-transform hover:scale-110 focus:outline-none cursor-pointer"
                              aria-label={`Rate ${starValue} out of 5 stars`}
                            >
                              <Star
                                className={cn(
                                  "h-6 w-6 transition-colors",
                                  active
                                    ? "fill-warning text-warning"
                                    : "text-muted-foreground/40"
                                )}
                              />
                            </button>
                          );
                        })}
                        <span className="ml-2 text-xs font-medium text-muted-foreground">
                          {selectedRating} / 5
                        </span>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="review_text"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Review</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="What did you enjoy about this book? Would you recommend it?"
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={createReviewMutation.isPending}
              >
                {createReviewMutation.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Submit Review
              </Button>
            </form>
          </Form>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-7">
        <CardHeader>
          <CardTitle className="text-base">
            Household Reviews ({reviews.length})
          </CardTitle>
          <CardDescription>
            Ratings and notes left by household readers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {reviewsQuery.isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : reviews.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              No reviews yet. Be the first household member to review this book!
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <div
                  key={review.id}
                  className="space-y-2 rounded-lg border bg-muted/20 p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {(review.username || "U").slice(0, 1).toUpperCase()}
                      </span>
                      <span className="text-sm font-medium">
                        {review.username || "Household Member"}
                      </span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={cn(
                            "h-4 w-4",
                            s <= review.rating
                              ? "fill-warning text-warning"
                              : "text-muted-foreground/30"
                          )}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="whitespace-pre-line text-sm text-foreground/90">
                    {review.review_text}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

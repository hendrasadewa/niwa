"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, PackageSearch } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function TrackOrderLookupPage() {
  const router = useRouter();
  const [orderId, setOrderId] = React.useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = orderId.trim();
    if (!trimmed) return;
    router.push(`/track/${encodeURIComponent(trimmed)}`);
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-12rem)] max-w-lg items-center px-4 py-12">
      <Card className="w-full shadow-sm">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto h-12 w-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
            <PackageSearch className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold">
            Track Your Pre-Order
          </CardTitle>
          <CardDescription>
            Enter your unique Order ID to view real-time fulfillment status,
            upload your payment receipt, or confirm delivery.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              className="font-mono text-sm"
              required
            />
            <Button type="submit" className="w-full gap-2">
              View Order Status Timeline
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

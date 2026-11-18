"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, type RegisterInput } from "@niwa/open-po-validators";
import { Loader2, ShoppingBag, Store, UserPlus, Users } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/auth-provider";
import { toast } from "@/hooks/use-toast";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerAccount } = useAuth();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      whatsapp_number: "",
      default_shipping_address: "",
      role: "member",
    },
  });

  const selectedRole = useWatch({
    control: form.control,
    name: "role",
  });

  async function onSubmit(values: RegisterInput) {
    setIsSubmitting(true);
    try {
      const res = await registerAccount({
        ...values,
        default_shipping_address: values.default_shipping_address?.trim()
          ? values.default_shipping_address.trim()
          : null,
      });
      toast({
        title: "Account created!",
        description: `Welcome to Open-PO, ${res.user.name}.`,
      });
      if (values.role === "seller") {
        router.push("/seller");
      } else {
        router.push("/");
      }
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Unable to create account. Please try again.";
      toast({
        variant: "destructive",
        title: "Registration failed",
        description: message,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-lg items-center px-4 py-10">
      <Card className="w-full shadow-sm">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <ShoppingBag className="h-5 w-5" />
          </div>
          <CardTitle className="text-2xl font-bold">
            Create an Open-PO Account
          </CardTitle>
          <CardDescription>
            Join as a Customer Member for faster checkout or as an UMKM Seller
            to open your pre-order store.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Type</FormLabel>
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => field.onChange("member")}
                        className={cn(
                          "flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-all",
                          selectedRole === "member"
                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                            : "hover:bg-muted/60"
                        )}
                      >
                        <div className="flex items-center gap-2 font-semibold text-sm">
                          <Users className="h-4 w-4" />
                          Customer
                        </div>
                        <span className="text-xs text-muted-foreground">
                          Save address, track orders & write reviews
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => field.onChange("seller")}
                        className={cn(
                          "flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-all",
                          selectedRole === "seller"
                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                            : "hover:bg-muted/60"
                        )}
                      >
                        <div className="flex items-center gap-2 font-semibold text-sm">
                          <Store className="h-4 w-4" />
                          UMKM Seller
                        </div>
                        <span className="text-xs text-muted-foreground">
                          Create a store, launch waves & manage Kanban
                        </span>
                      </button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Siti Rahma" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="whatsapp_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>WhatsApp Number</FormLabel>
                      <FormControl>
                        <Input placeholder="081234567890" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="siti@example.com"
                        autoComplete="email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="At least 8 characters"
                        autoComplete="new-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="default_shipping_address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Shipping Address (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={2}
                        placeholder="Jl. Melati No. 12, Jakarta Selatan 12430"
                        value={field.value ?? ""}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full gap-2"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
                Create Account
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="justify-center border-t pt-4 text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/login"
            className="ml-1 font-medium text-foreground underline underline-offset-4"
          >
            Sign in
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}

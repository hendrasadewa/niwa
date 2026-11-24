"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  updateStoreSchema,
  type UpdateStoreInput,
} from "@niwa/open-po-validators";
import { ImagePlus, Loader2, Save, Store as StoreIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Textarea,
  Button,
} from "@niwa/ui/primitives";
import { useAuth } from "@/providers/auth-provider";
import { apiClient, ApiError, getStoreLogoUrl } from "@/lib/api";
import type { Store } from "@/types/api";
import { toast } from "@niwa/ui/hooks";

export default function SellerStoreSettingsPage() {
  const { activeStore, refreshProfile } = useAuth();
  const [isSaving, setIsSaving] = React.useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = React.useState(false);
  const [logoVersion, setLogoVersion] = React.useState<number>(1);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const form = useForm<UpdateStoreInput>({
    resolver: zodResolver(updateStoreSchema),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      whatsapp_contact: "",
      payment_instructions: "",
    },
  });

  React.useEffect(() => {
    if (activeStore) {
      form.reset({
        name: activeStore.name,
        slug: activeStore.slug,
        description: activeStore.description,
        whatsapp_contact: activeStore.whatsapp_contact,
        payment_instructions: activeStore.payment_instructions,
      });
    }
  }, [activeStore, form]);

  if (!activeStore) {
    return (
      <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
        Please create a store from the Seller Overview tab first.
      </div>
    );
  }

  async function onSubmit(values: UpdateStoreInput) {
    if (!activeStore) return;
    setIsSaving(true);
    try {
      await apiClient.put<{ store: Store }>(
        `/api/v1/stores/${activeStore.id}`,
        values
      );
      await refreshProfile();
      toast({
        title: "Store settings saved",
        description: "Store details and payment instructions updated.",
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Save failed",
        description:
          err instanceof ApiError ? err.message : "Failed to update store.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !activeStore) return;

    setIsUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append("logo", file);
      await apiClient.upload(
        `/api/v1/stores/${activeStore.id}/logo`,
        formData,
        "PUT"
      );
      await refreshProfile();
      setLogoVersion((v) => v + 1);
      toast({
        title: "Store logo uploaded",
        description: "Your store logo is now stored in Cloudflare R2.",
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Logo upload failed",
        description:
          err instanceof ApiError ? err.message : "Could not upload logo.",
      });
    } finally {
      setIsUploadingLogo(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Store Logo (Cloudflare R2)</CardTitle>
          <CardDescription>
            Displayed on your public pre-order storefront and tracking pages.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <div className="h-32 w-32 rounded-2xl border bg-muted overflow-hidden flex items-center justify-center">
            {activeStore.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={getStoreLogoUrl(activeStore.id, logoVersion)}
                alt={activeStore.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <StoreIcon className="h-10 w-10 text-muted-foreground" />
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleLogoChange}
            className="hidden"
          />

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isUploadingLogo}
            onClick={() => fileInputRef.current?.click()}
            className="gap-2"
          >
            {isUploadingLogo ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ImagePlus className="h-4 w-4" />
            )}
            {activeStore.logo_url ? "Replace Logo" : "Upload Logo"}
          </Button>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">
            Store Configuration & Payment Instructions
          </CardTitle>
          <CardDescription>
            Define your store slug, WhatsApp contact, and manual bank/e-wallet
            transfer instructions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Store Name</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Store Slug</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="whatsapp_contact"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>WhatsApp Number (for Order Confirmation)</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Store Description</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={3}
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="payment_instructions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Manual Payment Transfer Instructions (Shown at Checkout)
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        rows={5}
                        placeholder="e.g. BCA 1234567890 a/n Hendra, Mandiri 9876543210, GoPay 0812..."
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={isSaving} className="gap-2">
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Store Settings
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

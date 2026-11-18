"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createProductSchema,
  type CreateProductInput,
} from "@niwa/open-po-validators";
import {
  Archive,
  ArchiveRestore,
  Edit3,
  ImagePlus,
  Loader2,
  Package,
  Plus,
  Search,
} from "lucide-react";
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
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/providers/auth-provider";
import { apiClient, ApiError, getProductImageUrl } from "@/lib/api";
import type { Product } from "@/types/api";
import { toast } from "@/hooks/use-toast";
import { formatCurrencyIDR } from "@/lib/utils";

export default function SellerProductsPage() {
  const { activeStore } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = React.useState("");
  const [includeArchived, setIncludeArchived] = React.useState(true);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingProduct, setEditingProduct] = React.useState<Product | null>(
    null
  );
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [imageBust, setImageBust] = React.useState<number>(1);

  const { data, isLoading } = useQuery({
    queryKey: [
      "seller-products",
      activeStore?.id,
      search.trim(),
      includeArchived,
    ],
    queryFn: () =>
      apiClient.get<{ products: Product[] }>("/api/v1/products", {
        params: {
          store_id: activeStore!.id,
          search: search.trim() || undefined,
          include_archived: includeArchived ? "true" : "false",
        },
      }),
    enabled: Boolean(activeStore?.id),
  });

  const form = useForm<CreateProductInput>({
    resolver: zodResolver(createProductSchema),
    defaultValues: {
      store_id: activeStore?.id ?? "",
      name: "",
      description: "",
      base_price: 25000,
    },
  });

  function openCreateModal() {
    if (!activeStore) return;
    setEditingProduct(null);
    setSelectedFile(null);
    form.reset({
      store_id: activeStore.id,
      name: "",
      description: "",
      base_price: 25000,
    });
    setModalOpen(true);
  }

  function openEditModal(product: Product) {
    setEditingProduct(product);
    setSelectedFile(null);
    form.reset({
      store_id: product.store_id,
      name: product.name,
      description: product.description,
      base_price: product.base_price,
    });
    setModalOpen(true);
  }

  async function onSubmit(values: CreateProductInput) {
    if (!activeStore) return;
    setIsSaving(true);
    try {
      let targetProductId = editingProduct?.id;

      if (editingProduct) {
        const res = await apiClient.put<{ product: Product }>(
          `/api/v1/products/${editingProduct.id}`,
          {
            name: values.name,
            description: values.description,
            base_price: Number(values.base_price),
          }
        );
        targetProductId = res.product.id;
      } else {
        const res = await apiClient.post<{ product: Product }>(
          "/api/v1/products",
          {
            store_id: activeStore.id,
            name: values.name,
            description: values.description,
            base_price: Number(values.base_price),
          }
        );
        targetProductId = res.product.id;
      }

      if (selectedFile && targetProductId) {
        const formData = new FormData();
        formData.append("image", selectedFile);
        await apiClient.upload(
          `/api/v1/products/${targetProductId}/image`,
          formData,
          "PUT"
        );
        setImageBust((v) => v + 1);
      }

      await queryClient.invalidateQueries({
        queryKey: ["seller-products", activeStore.id],
      });

      toast({
        title: editingProduct ? "Product updated" : "Product created",
        description: `${values.name} saved to your master catalog.`,
      });
      setModalOpen(false);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Failed to save product",
        description:
          err instanceof ApiError ? err.message : "Could not save product.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  const archiveMutation = useMutation({
    mutationFn: ({
      productId,
      isArchived,
    }: {
      productId: string;
      isArchived: boolean;
    }) =>
      apiClient.patch<{ product: Product }>(
        `/api/v1/products/${productId}/archive`,
        { is_archived: isArchived }
      ),
    onSuccess: (res) => {
      queryClient.invalidateQueries({
        queryKey: ["seller-products", activeStore?.id],
      });
      toast({
        title: res.product.is_archived
          ? "Product archived"
          : "Product restored",
        description: `${res.product.name} is now ${
          res.product.is_archived ? "archived" : "active in your master catalog"
        }.`,
      });
    },
  });

  if (!activeStore) {
    return (
      <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
        Please create a store from the Seller Overview tab first.
      </div>
    );
  }

  const products = data?.products ?? [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-lg">Master Product Catalog</CardTitle>
            <CardDescription>
              Manage base products and R2 images. Changes to base prices here
              never alter locked prices in past or active pre-order waves.
            </CardDescription>
          </div>
          <Button onClick={openCreateModal} className="gap-2 shrink-0">
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products by name or description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <Button
              type="button"
              variant={includeArchived ? "secondary" : "outline"}
              size="sm"
              onClick={() => setIncludeArchived((prev) => !prev)}
            >
              {includeArchived ? "Showing Archived" : "Hiding Archived"}
            </Button>
          </div>

          {isLoading ? (
            <div className="py-12 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : products.length === 0 ? (
            <div className="rounded-lg border border-dashed py-12 text-center space-y-2">
              <Package className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium">
                No products in your Master Catalog
              </p>
              <p className="text-xs text-muted-foreground">
                Add your first UMKM product so you can attach it to a Pre-Order
                Wave.
              </p>
              <Button size="sm" onClick={openCreateModal} className="mt-2">
                Add First Product
              </Button>
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[70px]">Image</TableHead>
                    <TableHead>Product Name & Description</TableHead>
                    <TableHead>Base Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow
                      key={product.id}
                      className={product.is_archived ? "opacity-60" : ""}
                    >
                      <TableCell>
                        <div className="h-12 w-12 rounded-md border bg-muted overflow-hidden flex items-center justify-center">
                          {product.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={getProductImageUrl(
                                product.id,
                                `${product.image_url}-${imageBust}`
                              )}
                              alt={product.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Package className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-md">
                        <p className="font-semibold text-sm">{product.name}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {product.description}
                        </p>
                      </TableCell>
                      <TableCell className="font-medium text-sm">
                        {formatCurrencyIDR(product.base_price)}
                      </TableCell>
                      <TableCell>
                        {product.is_archived ? (
                          <Badge variant="outline">Archived</Badge>
                        ) : (
                          <Badge variant="secondary">Active</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => openEditModal(product)}
                            className="h-8 gap-1 text-xs"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={archiveMutation.isPending}
                            onClick={() =>
                              archiveMutation.mutate({
                                productId: product.id,
                                isArchived: !product.is_archived,
                              })
                            }
                            className="h-8 gap-1 text-xs"
                          >
                            {product.is_archived ? (
                              <>
                                <ArchiveRestore className="h-3.5 w-3.5" />
                                Restore
                              </>
                            ) : (
                              <>
                                <Archive className="h-3.5 w-3.5" />
                                Archive
                              </>
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingProduct
                ? "Edit Master Catalog Product"
                : "Add Master Catalog Product"}
            </DialogTitle>
            <DialogDescription>
              Products created here can be included in any future Pre-Order Wave
              with a locked snapshot price.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Nastar Wijsman Premium 500gr"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="base_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Base Price (IDR)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step={500}
                        value={field.value}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === ""
                              ? 0
                              : parseInt(e.target.value, 10)
                          )
                        }
                      />
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
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={3}
                        placeholder="Ingredients, weight, packaging details..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-1.5">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <ImagePlus className="h-4 w-4" />
                  Product Image (Cloudflare R2)
                </label>
                <Input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={(e) =>
                    setSelectedFile(e.target.files?.[0] ?? null)
                  }
                />
                <p className="text-xs text-muted-foreground">
                  {selectedFile
                    ? `Selected: ${selectedFile.name}`
                    : editingProduct?.image_url
                      ? "Leave blank to keep the existing product image."
                      : "Optional: Upload a JPEG, PNG, or WebP photo (max 5MB)."}
                </p>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving} className="gap-2">
                  {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingProduct ? "Save Changes" : "Create Product"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

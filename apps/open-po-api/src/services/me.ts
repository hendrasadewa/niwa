import { AuthErrors } from "../errors/auth";
import type { AuthApiRepo } from "../repositories/auth-api";
import type { CustomerProfileRepo } from "../repositories/customer-profiles";
import type { OrderRepo } from "../repositories/orders";
import type { StoreRepo } from "../repositories/stores";
import type { AuthUser } from "../types/auth";
import { mapAuthApiUserToOpenPoUser } from "../utils/auth";

export type MeServiceDeps = {
  authApiRepo: AuthApiRepo;
  customerProfileRepo: CustomerProfileRepo;
  storeRepo: StoreRepo;
  orderRepo: OrderRepo;
};

export function createMeService({
  authApiRepo,
  customerProfileRepo,
  storeRepo,
  orderRepo,
}: MeServiceDeps) {
  return {
    async getProfile(user: AuthUser) {
      const ownedStores = await storeRepo.findByOwnerId(user.id);
      return { user, stores: ownedStores };
    },

    async updateProfile(input: {
      user: AuthUser;
      authToken: string;
      updates: {
        name?: string;
        whatsapp_number?: string;
        default_shipping_address?: string | null;
      };
    }): Promise<{ user: AuthUser; token?: string }> {
      let updatedUser: AuthUser = { ...input.user };
      let refreshedToken: string | undefined;

      if (
        input.updates.name !== undefined ||
        input.updates.whatsapp_number !== undefined
      ) {
        const res = await authApiRepo.request("/api/v1/auth/me", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${input.authToken}`,
          },
          body: JSON.stringify({
            ...(input.updates.name !== undefined
              ? { name: input.updates.name }
              : {}),
            ...(input.updates.whatsapp_number !== undefined
              ? { whatsapp_number: input.updates.whatsapp_number }
              : {}),
          }),
        });

        if (!res.ok || !res.data?.user) {
          throw AuthErrors.upstream({
            status: res.status,
            error: res.data?.error ?? "AuthError",
            code: res.data?.code,
            message:
              res.data?.message ??
              "Failed to update user identity in authentication service",
            details: res.data?.details,
          });
        }

        updatedUser = mapAuthApiUserToOpenPoUser(
          res.data.user,
          input.user.default_shipping_address
        );
        refreshedToken = res.data.token;
      }

      if (input.updates.default_shipping_address !== undefined) {
        const nextAddress = input.updates.default_shipping_address;
        await customerProfileRepo.upsertShippingAddress(
          input.user.id,
          nextAddress,
          Math.floor(Date.now() / 1000)
        );
        updatedUser = {
          ...updatedUser,
          default_shipping_address: nextAddress,
        };
      }

      return {
        user: updatedUser,
        ...(refreshedToken ? { token: refreshedToken } : {}),
      };
    },

    async listOwnedStores(userId: string) {
      return storeRepo.findByOwnerId(userId);
    },

    async listMyOrders(userId: string) {
      const userOrders = await orderRepo.listByCustomerId(userId);
      if (userOrders.length === 0) {
        return [];
      }

      const items = await orderRepo.findItemsWithProductsByOrderIds(
        userOrders.map((o) => o.id)
      );

      const itemsByOrder = new Map<string, typeof items>();
      for (const item of items) {
        const list = itemsByOrder.get(item.order_id) ?? [];
        list.push(item);
        itemsByOrder.set(item.order_id, list);
      }

      return userOrders.map((order) => ({
        ...order,
        items: itemsByOrder.get(order.id) ?? [],
      }));
    },
  };
}

export type MeService = ReturnType<typeof createMeService>;

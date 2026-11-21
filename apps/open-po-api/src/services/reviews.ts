import { CommerceErrors } from "../errors/commerce";
import type { OrderRepo } from "../repositories/orders";
import type { ProductRepo } from "../repositories/products";
import type { ReviewRepo } from "../repositories/reviews";
import type { AuthUser } from "../types/auth";

export type ReviewServiceDeps = {
  reviewRepo: ReviewRepo;
  orderRepo: OrderRepo;
  productRepo: ProductRepo;
};

export function createReviewService({
  reviewRepo,
  orderRepo,
  productRepo,
}: ReviewServiceDeps) {
  return {
    async createReview(input: {
      user: AuthUser;
      order_id: string;
      product_id: string;
      rating: number;
      comment: string;
    }) {
      const order = await orderRepo.findByIdOrSlug(input.order_id);
      if (!order) {
        throw CommerceErrors.orderNotFound();
      }

      if (
        order.customer_id !== input.user.id &&
        !input.user.roles.includes("admin")
      ) {
        throw CommerceErrors.reviewOwnOrdersOnly();
      }

      if (order.status !== "Received by Customer") {
        throw CommerceErrors.reviewOrderNotReceived();
      }

      const product = await productRepo.findById(input.product_id);
      if (!product) {
        throw CommerceErrors.productNotFound();
      }

      const orderedProduct = await orderRepo.hasProductInOrder(
        order.id,
        input.product_id
      );
      if (!orderedProduct) {
        throw CommerceErrors.reviewProductNotInOrder();
      }

      const existing = await reviewRepo.findByOrderProductCustomer(
        order.id,
        input.product_id,
        input.user.id
      );
      if (existing) {
        throw CommerceErrors.reviewAlreadyExists();
      }

      const created = await reviewRepo.create({
        id: crypto.randomUUID(),
        product_id: input.product_id,
        order_id: order.id,
        customer_id: input.user.id,
        customer_name: input.user.name,
        rating: input.rating,
        comment: input.comment,
        created_at: Math.floor(Date.now() / 1000),
      });

      return {
        ...created,
        order_slug: order.slug,
      };
    },
  };
}

export type ReviewService = ReturnType<typeof createReviewService>;

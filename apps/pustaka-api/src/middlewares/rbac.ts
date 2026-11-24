import { createRbacMiddlewares } from "@niwa/api-core/middlewares";
import { AuthErrors } from "../errors/auth";
import type { RoleName } from "../types/auth";
import type { AppEnv } from "../types/env";

export const { requireRole, requirePermission } = createRbacMiddlewares<
  AppEnv,
  RoleName
>({
  onInsufficientRole: (allowedRoles) => AuthErrors.insufficientRole(allowedRoles),
  onMissingPermissions: (requiredPermissions) =>
    AuthErrors.missingPermissions(requiredPermissions),
});

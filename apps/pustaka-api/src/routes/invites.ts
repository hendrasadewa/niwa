import { Hono, type Context } from "hono";
import { authMiddleware } from "../middlewares/auth";
import { createLibraryRepo } from "../repositories/libraries";
import { createLibraryInviteRepo } from "../repositories/library-invites";
import { createLibraryMemberRepo } from "../repositories/library-members";
import { createLibraryInviteService } from "../services/library-invites";
import type { AppEnv } from "../types/env";
import { validate } from "../validators";
import { inviteCodeParamSchema } from "../validators/libraries";

function getLibraryInviteService(c: Context<AppEnv>) {
  const db = c.get("db");
  return createLibraryInviteService({
    libraryRepo: createLibraryRepo(db),
    libraryMemberRepo: createLibraryMemberRepo(db),
    libraryInviteRepo: createLibraryInviteRepo(db),
  });
}

export const invitesRoutes = new Hono<AppEnv>();

// GET /api/v1/invites/:code (public preview)
invitesRoutes.get(
  "/:code",
  validate("param", inviteCodeParamSchema),
  async (c) => {
    const { code } = c.req.valid("param");
    const invite = await getLibraryInviteService(c).previewInvite(code);
    return c.json({ invite });
  }
);

// POST /api/v1/invites/:code/join
invitesRoutes.post(
  "/:code/join",
  authMiddleware,
  validate("param", inviteCodeParamSchema),
  async (c) => {
    const { code } = c.req.valid("param");
    const result = await getLibraryInviteService(c).joinByInvite(
      code,
      c.get("user")
    );
    return c.json(result, 201);
  }
);

import { Hono, type Context } from "hono";
import { authMiddleware } from "../../middlewares/auth";
import { createLibraryRepo } from "../../repositories/libraries";
import { createLibraryInviteRepo } from "../../repositories/library-invites";
import { createLibraryMemberRepo } from "../../repositories/library-members";
import { createLibraryInviteService } from "../../services/library-invites";
import type { AppEnv } from "../../types/env";
import { validate } from "../../validators";
import {
  createLibraryInviteSchema,
  inviteIdParamSchema,
  libraryIdParamSchema,
} from "../../validators/libraries";

function getLibraryInviteService(c: Context<AppEnv>) {
  const db = c.get("db");
  return createLibraryInviteService({
    libraryRepo: createLibraryRepo(db),
    libraryMemberRepo: createLibraryMemberRepo(db),
    libraryInviteRepo: createLibraryInviteRepo(db),
  });
}

export const libraryInvitesRoutes = new Hono<AppEnv>();

// GET /api/v1/libraries/:libraryId/invites
libraryInvitesRoutes.get(
  "/:libraryId/invites",
  authMiddleware,
  validate("param", libraryIdParamSchema),
  async (c) => {
    const { libraryId } = c.req.valid("param");
    const invites = await getLibraryInviteService(c).listInvites(
      libraryId,
      c.get("user")
    );
    return c.json({ invites });
  }
);

// POST /api/v1/libraries/:libraryId/invites
libraryInvitesRoutes.post(
  "/:libraryId/invites",
  authMiddleware,
  validate("param", libraryIdParamSchema),
  validate("json", createLibraryInviteSchema),
  async (c) => {
    const { libraryId } = c.req.valid("param");
    const body = c.req.valid("json");
    const invite = await getLibraryInviteService(c).createInvite(
      libraryId,
      body,
      c.get("user")
    );
    return c.json({ invite }, 201);
  }
);

// DELETE /api/v1/libraries/:libraryId/invites/:inviteId
libraryInvitesRoutes.delete(
  "/:libraryId/invites/:inviteId",
  authMiddleware,
  validate("param", inviteIdParamSchema),
  async (c) => {
    const { libraryId, inviteId } = c.req.valid("param");
    const result = await getLibraryInviteService(c).revokeInvite(
      libraryId,
      inviteId,
      c.get("user")
    );
    return c.json({
      message: "Invite revoked successfully",
      id: result.id,
    });
  }
);

import { Hono, type Context } from "hono";
import { authMiddleware } from "../../middlewares/auth";
import { createBookRepo } from "../../repositories/books";
import { createLibraryRepo } from "../../repositories/libraries";
import { createLibraryMemberRepo } from "../../repositories/library-members";
import { createLibraryService } from "../../services/libraries";
import type { AppEnv } from "../../types/env";
import { validate } from "../../validators";
import {
  libraryIdParamSchema,
  memberUserIdParamSchema,
} from "../../validators/libraries";

function getLibraryService(c: Context<AppEnv>) {
  const db = c.get("db");
  return createLibraryService({
    libraryRepo: createLibraryRepo(db),
    libraryMemberRepo: createLibraryMemberRepo(db),
    bookRepo: createBookRepo(db),
  });
}

export const libraryMembersRoutes = new Hono<AppEnv>();

// GET /api/v1/libraries/:libraryId/members
libraryMembersRoutes.get(
  "/:libraryId/members",
  authMiddleware,
  validate("param", libraryIdParamSchema),
  async (c) => {
    const { libraryId } = c.req.valid("param");
    const result = await getLibraryService(c).listMembers(
      libraryId,
      c.get("user")
    );
    return c.json(result);
  }
);

// DELETE /api/v1/libraries/:libraryId/members/:userId
libraryMembersRoutes.delete(
  "/:libraryId/members/:userId",
  authMiddleware,
  validate("param", memberUserIdParamSchema),
  async (c) => {
    const { libraryId, userId } = c.req.valid("param");
    const result = await getLibraryService(c).removeMember(
      libraryId,
      userId,
      c.get("user")
    );
    return c.json({
      message: "Member removed from library",
      user_id: result.user_id,
    });
  }
);

// POST /api/v1/libraries/:libraryId/leave
libraryMembersRoutes.post(
  "/:libraryId/leave",
  authMiddleware,
  validate("param", libraryIdParamSchema),
  async (c) => {
    const { libraryId } = c.req.valid("param");
    const result = await getLibraryService(c).leaveLibrary(
      libraryId,
      c.get("user")
    );
    return c.json({
      message: "Left library successfully",
      library_id: result.library_id,
    });
  }
);

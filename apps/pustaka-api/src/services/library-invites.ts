import type { LibraryVisibility } from "@niwa/pustaka-validators";
import { LibraryErrors } from "../errors/library";
import type { LibraryRepo } from "../repositories/libraries";
import type {
  LibraryInviteRecord,
  LibraryInviteRepo,
} from "../repositories/library-invites";
import type {
  LibraryMemberRecord,
  LibraryMemberRepo,
} from "../repositories/library-members";
import type { AuthUser } from "../types/auth";
import type { InvitePreviewResponse } from "../types/library";
import { generateInviteCode } from "../utils/library";
import { createLibraryAccess } from "./library-access";

export type LibraryInviteServiceDeps = {
  libraryRepo: LibraryRepo;
  libraryMemberRepo: LibraryMemberRepo;
  libraryInviteRepo: LibraryInviteRepo;
};

export function createLibraryInviteService({
  libraryRepo,
  libraryMemberRepo,
  libraryInviteRepo,
}: LibraryInviteServiceDeps) {
  const access = createLibraryAccess({ libraryRepo, libraryMemberRepo });

  function evaluateInviteState(invite: LibraryInviteRecord, now: number) {
    if (invite.revoked_at !== null) {
      return { active: false as const, reason: "revoked" as const };
    }
    if (invite.expires_at !== null && invite.expires_at <= now) {
      return { active: false as const, reason: "expired" as const };
    }
    if (invite.max_uses !== null && invite.uses_count >= invite.max_uses) {
      return { active: false as const, reason: "max_uses" as const };
    }
    return { active: true as const, reason: null };
  }

  return {
    async listInvites(
      libraryId: string,
      actor: AuthUser
    ): Promise<LibraryInviteRecord[]> {
      const library = await access.assertLibraryOwnerById(libraryId, actor.id);
      return libraryInviteRepo.listByLibrary(library.id);
    },

    async createInvite(
      libraryId: string,
      input: {
        max_uses?: number | null;
        expires_in_hours?: number | null;
      },
      actor: AuthUser
    ): Promise<LibraryInviteRecord> {
      const library = await access.assertLibraryOwnerById(libraryId, actor.id);
      const now = Math.floor(Date.now() / 1000);
      const expiresAt =
        input.expires_in_hours !== undefined && input.expires_in_hours !== null
          ? now + input.expires_in_hours * 3600
          : null;

      return libraryInviteRepo.create({
        id: crypto.randomUUID(),
        library_id: library.id,
        code: generateInviteCode(12),
        created_by: actor.id,
        max_uses: input.max_uses ?? null,
        uses_count: 0,
        expires_at: expiresAt,
        revoked_at: null,
        created_at: now,
      });
    },

    async revokeInvite(
      libraryId: string,
      inviteId: string,
      actor: AuthUser
    ): Promise<{ id: string }> {
      const library = await access.assertLibraryOwnerById(libraryId, actor.id);
      const invite = await libraryInviteRepo.findById(inviteId);
      if (!invite || invite.library_id !== library.id) {
        throw LibraryErrors.inviteNotFound();
      }

      if (invite.revoked_at === null) {
        await libraryInviteRepo.revoke(invite.id, Math.floor(Date.now() / 1000));
      }

      return { id: invite.id };
    },

    async previewInvite(code: string): Promise<InvitePreviewResponse> {
      const invite = await libraryInviteRepo.findByCode(code);
      if (!invite) {
        throw LibraryErrors.inviteNotFound();
      }

      const library = await libraryRepo.findById(invite.library_id);
      if (!library) {
        throw LibraryErrors.inviteNotFound();
      }

      const state = evaluateInviteState(invite, Math.floor(Date.now() / 1000));

      return {
        code: invite.code,
        is_active: state.active,
        expires_at: invite.expires_at,
        max_uses: invite.max_uses,
        uses_count: invite.uses_count,
        library: {
          id: library.id,
          name: library.name,
          slug: library.slug,
          description: library.description,
          owner_name: library.owner_name,
          visibility: library.visibility as LibraryVisibility,
        },
      };
    },

    async joinByInvite(
      code: string,
      actor: AuthUser
    ): Promise<{ library_id: string; membership: LibraryMemberRecord }> {
      const invite = await libraryInviteRepo.findByCode(code);
      if (!invite) {
        throw LibraryErrors.inviteNotFound();
      }

      const library = await libraryRepo.findById(invite.library_id);
      if (!library) {
        throw LibraryErrors.inviteNotFound();
      }

      const now = Math.floor(Date.now() / 1000);
      const state = evaluateInviteState(invite, now);
      if (!state.active) {
        if (state.reason === "revoked") throw LibraryErrors.inviteRevoked();
        if (state.reason === "expired") throw LibraryErrors.inviteExpired();
        throw LibraryErrors.inviteMaxUsesReached();
      }

      if (library.owner_id === actor.id) {
        throw LibraryErrors.alreadyLibraryMember(
          "You already own this library"
        );
      }

      const existingMember = await libraryMemberRepo.findByLibraryAndUser(
        library.id,
        actor.id
      );
      if (existingMember) {
        throw LibraryErrors.alreadyLibraryMember();
      }

      const membership: LibraryMemberRecord = {
        id: crypto.randomUUID(),
        library_id: library.id,
        user_id: actor.id,
        username: actor.username,
        joined_at: now,
      };

      await libraryInviteRepo.acceptInviteAtomic({
        inviteId: invite.id,
        member: membership,
      });

      return {
        library_id: library.id,
        membership,
      };
    },
  };
}

export type LibraryInviteService = ReturnType<
  typeof createLibraryInviteService
>;

import type { LibraryScope, LibraryVisibility } from "@niwa/pustaka-validators";
import { LibraryErrors } from "../errors/library";
import type { BookRepo } from "../repositories/books";
import type { LibraryRecord, LibraryRepo } from "../repositories/libraries";
import type {
  LibraryMemberRecord,
  LibraryMemberRepo,
} from "../repositories/library-members";
import type { AuthUser } from "../types/auth";
import type { LibraryRole, LibraryWithMeta } from "../types/library";
import { generateShortSuffix, slugifyLibraryName } from "../utils/library";
import { createLibraryAccess } from "./library-access";

export type LibraryServiceDeps = {
  libraryRepo: LibraryRepo;
  libraryMemberRepo: LibraryMemberRepo;
  bookRepo: BookRepo;
};

function toLibraryWithMeta(
  record: LibraryRecord,
  role: LibraryRole | null,
  counts: { bookCount: number; bookshelfCount: number; memberCount: number }
): LibraryWithMeta {
  return {
    id: record.id,
    name: record.name,
    slug: record.slug,
    description: record.description,
    owner_id: record.owner_id,
    owner_name: record.owner_name,
    visibility: record.visibility as LibraryVisibility,
    created_at: record.created_at,
    updated_at: record.updated_at,
    role,
    book_count: counts.bookCount,
    bookshelf_count: counts.bookshelfCount,
    member_count: counts.memberCount,
  };
}

export function createLibraryService({
  libraryRepo,
  libraryMemberRepo,
  bookRepo,
}: LibraryServiceDeps) {
  const access = createLibraryAccess({ libraryRepo, libraryMemberRepo });

  async function resolveUniqueSlug(name: string, requestedSlug?: string) {
    if (requestedSlug) {
      const existing = await libraryRepo.findBySlug(requestedSlug);
      if (existing) {
        throw LibraryErrors.librarySlugConflict(requestedSlug);
      }
      return requestedSlug;
    }

    const base = slugifyLibraryName(name);
    const existingBase = await libraryRepo.findBySlug(base);
    if (!existingBase) {
      return base;
    }

    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = `${base}-${generateShortSuffix(5)}`;
      const existingCandidate = await libraryRepo.findBySlug(candidate);
      if (!existingCandidate) {
        return candidate;
      }
    }

    return `${base}-${crypto.randomUUID().slice(0, 8)}`;
  }

  return {
    async listLibraries(
      actor: AuthUser | null,
      filters: { scope?: LibraryScope; search?: string }
    ): Promise<LibraryWithMeta[]> {
      const viewerId = actor?.id ?? null;
      const memberLibraryIds = await access.getMemberLibraryIds(viewerId);
      const memberSet = new Set(memberLibraryIds);

      const effectiveScope: LibraryScope =
        filters.scope ?? (viewerId ? "mine" : "public");

      let records: LibraryRecord[];
      if (effectiveScope === "public") {
        records = await libraryRepo.listPublic(filters.search);
      } else if (effectiveScope === "mine") {
        records = viewerId
          ? await libraryRepo.listMine(viewerId, memberLibraryIds, filters.search)
          : [];
      } else {
        records = await libraryRepo.listAccessible(
          viewerId,
          memberLibraryIds,
          filters.search
        );
      }

      const counts = await libraryRepo.getCountsByLibraryIds(
        records.map((item) => item.id)
      );

      return records.map((record) => {
        const role: LibraryRole | null =
          viewerId && record.owner_id === viewerId
            ? "owner"
            : memberSet.has(record.id)
              ? "member"
              : null;

        return toLibraryWithMeta(record, role, {
          bookCount: counts.bookCounts.get(record.id) ?? 0,
          bookshelfCount: counts.bookshelfCounts.get(record.id) ?? 0,
          memberCount: counts.memberCounts.get(record.id) ?? 0,
        });
      });
    },

    async getLibrary(
      identifier: string,
      actor: AuthUser | null
    ): Promise<LibraryWithMeta> {
      const { library, role } = await access.assertCanViewLibraryByIdOrSlug(
        identifier,
        actor?.id ?? null
      );

      const counts = await libraryRepo.getCountsByLibraryIds([library.id]);

      return toLibraryWithMeta(library, role, {
        bookCount: counts.bookCounts.get(library.id) ?? 0,
        bookshelfCount: counts.bookshelfCounts.get(library.id) ?? 0,
        memberCount: counts.memberCounts.get(library.id) ?? 0,
      });
    },

    async createLibrary(
      input: {
        name: string;
        slug?: string;
        description?: string | null;
        visibility?: LibraryVisibility;
      },
      actor: AuthUser
    ): Promise<LibraryWithMeta> {
      const slug = await resolveUniqueSlug(input.name, input.slug);
      const now = Math.floor(Date.now() / 1000);

      const created = await libraryRepo.create({
        id: crypto.randomUUID(),
        name: input.name,
        slug,
        description: input.description ?? null,
        owner_id: actor.id,
        owner_name: actor.username,
        visibility: input.visibility ?? "private",
        created_at: now,
        updated_at: now,
      });

      return toLibraryWithMeta(created, "owner", {
        bookCount: 0,
        bookshelfCount: 0,
        memberCount: 0,
      });
    },

    async updateLibrary(
      libraryId: string,
      updates: {
        name?: string;
        slug?: string;
        description?: string | null;
        visibility?: LibraryVisibility;
      },
      actor: AuthUser
    ): Promise<LibraryWithMeta> {
      const existing = await access.assertLibraryOwnerById(libraryId, actor.id);

      let nextSlug = existing.slug;
      if (updates.slug && updates.slug !== existing.slug) {
        const conflict = await libraryRepo.findBySlug(updates.slug);
        if (conflict) {
          throw LibraryErrors.librarySlugConflict(updates.slug);
        }
        nextSlug = updates.slug;
      }

      const now = Math.floor(Date.now() / 1000);
      const nextFields = {
        name: updates.name ?? existing.name,
        slug: nextSlug,
        description:
          updates.description !== undefined
            ? updates.description
            : existing.description,
        visibility: updates.visibility ?? existing.visibility,
        updated_at: now,
      };

      await libraryRepo.update(existing.id, nextFields);

      const counts = await libraryRepo.getCountsByLibraryIds([existing.id]);

      return toLibraryWithMeta(
        {
          ...existing,
          ...nextFields,
        },
        "owner",
        {
          bookCount: counts.bookCounts.get(existing.id) ?? 0,
          bookshelfCount: counts.bookshelfCounts.get(existing.id) ?? 0,
          memberCount: counts.memberCounts.get(existing.id) ?? 0,
        }
      );
    },

    async deleteLibrary(
      libraryId: string,
      actor: AuthUser
    ): Promise<{ id: string }> {
      const existing = await access.assertLibraryOwnerById(libraryId, actor.id);

      const bookCount = await bookRepo.countByLibrary(existing.id);
      if (bookCount > 0) {
        throw LibraryErrors.libraryNotEmpty(bookCount);
      }

      await libraryRepo.deleteById(existing.id);
      return { id: existing.id };
    },

    async transferOwnership(
      libraryId: string,
      newOwnerId: string,
      actor: AuthUser
    ): Promise<LibraryWithMeta> {
      const existing = await access.assertLibraryOwnerById(libraryId, actor.id);

      if (newOwnerId === existing.owner_id) {
        throw LibraryErrors.cannotTransferToSelf();
      }

      const targetMember = await libraryMemberRepo.findByLibraryAndUser(
        existing.id,
        newOwnerId
      );
      if (!targetMember) {
        throw LibraryErrors.ownerNotMember(
          "New owner must already be a member of this library"
        );
      }

      const now = Math.floor(Date.now() / 1000);
      await libraryRepo.transferOwnershipAtomic({
        libraryId: existing.id,
        previousOwnerId: existing.owner_id,
        previousOwnerName: actor.username || existing.owner_name,
        newOwnerId: targetMember.user_id,
        newOwnerName: targetMember.username,
        previousOwnerMemberId: crypto.randomUUID(),
        now,
      });

      const counts = await libraryRepo.getCountsByLibraryIds([existing.id]);

      return toLibraryWithMeta(
        {
          ...existing,
          owner_id: targetMember.user_id,
          owner_name: targetMember.username,
          updated_at: now,
        },
        "member",
        {
          bookCount: counts.bookCounts.get(existing.id) ?? 0,
          bookshelfCount: counts.bookshelfCounts.get(existing.id) ?? 0,
          memberCount: counts.memberCounts.get(existing.id) ?? 0,
        }
      );
    },

    async listMembers(
      libraryId: string,
      actor: AuthUser
    ): Promise<{
      owner: { user_id: string; username: string };
      members: LibraryMemberRecord[];
    }> {
      const { library, role } = await access.assertCanViewLibraryById(
        libraryId,
        actor.id
      );

      if (role === null) {
        throw LibraryErrors.libraryForbidden(
          "Only library owners and members can view the member list"
        );
      }

      const members = await libraryMemberRepo.listByLibrary(library.id);
      return {
        owner: {
          user_id: library.owner_id,
          username: library.owner_name,
        },
        members,
      };
    },

    async removeMember(
      libraryId: string,
      memberUserId: string,
      actor: AuthUser
    ): Promise<{ user_id: string }> {
      const library = await access.assertLibraryOwnerById(libraryId, actor.id);

      const member = await libraryMemberRepo.findByLibraryAndUser(
        library.id,
        memberUserId
      );
      if (!member) {
        throw LibraryErrors.memberNotFound();
      }

      await libraryMemberRepo.deleteByLibraryAndUser(library.id, memberUserId);
      return { user_id: memberUserId };
    },

    async leaveLibrary(
      libraryId: string,
      actor: AuthUser
    ): Promise<{ library_id: string }> {
      const { library, role } = await access.assertCanViewLibraryById(
        libraryId,
        actor.id
      );

      if (role === "owner") {
        throw LibraryErrors.cannotLeaveAsOwner();
      }
      if (role !== "member") {
        throw LibraryErrors.memberNotFound();
      }

      await libraryMemberRepo.deleteByLibraryAndUser(library.id, actor.id);
      return { library_id: library.id };
    },
  };
}

export type LibraryService = ReturnType<typeof createLibraryService>;

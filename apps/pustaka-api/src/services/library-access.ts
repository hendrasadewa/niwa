import { LibraryErrors } from "../errors/library";
import type { LibraryRecord, LibraryRepo } from "../repositories/libraries";
import type { LibraryMemberRepo } from "../repositories/library-members";
import type { LibraryRole } from "../types/library";

export type LibraryAccessDeps = {
  libraryRepo: LibraryRepo;
  libraryMemberRepo: LibraryMemberRepo;
};

export function createLibraryAccess({
  libraryRepo,
  libraryMemberRepo,
}: LibraryAccessDeps) {
  async function getRole(
    library: LibraryRecord,
    viewerUserId: string | null
  ): Promise<LibraryRole | null> {
    if (!viewerUserId) return null;
    if (library.owner_id === viewerUserId) return "owner";
    const membership = await libraryMemberRepo.findByLibraryAndUser(
      library.id,
      viewerUserId
    );
    return membership ? "member" : null;
  }

  return {
    getRole,

    async canViewLibrary(
      library: LibraryRecord,
      viewerUserId: string | null
    ): Promise<{ allowed: boolean; role: LibraryRole | null }> {
      const role = await getRole(library, viewerUserId);
      const allowed = library.visibility === "public" || role !== null;
      return { allowed, role };
    },

    async assertCanViewLibraryById(
      libraryId: string,
      viewerUserId: string | null,
      notFoundFactory: () => Error = () => LibraryErrors.libraryNotFound()
    ): Promise<{ library: LibraryRecord; role: LibraryRole | null }> {
      const library = await libraryRepo.findById(libraryId);
      if (!library) {
        throw notFoundFactory();
      }
      const role = await getRole(library, viewerUserId);
      if (library.visibility !== "public" && role === null) {
        throw notFoundFactory();
      }
      return { library, role };
    },

    async assertCanViewLibraryByIdOrSlug(
      identifier: string,
      viewerUserId: string | null
    ): Promise<{ library: LibraryRecord; role: LibraryRole | null }> {
      const library = await libraryRepo.findByIdOrSlug(identifier);
      if (!library) {
        throw LibraryErrors.libraryNotFound();
      }
      const role = await getRole(library, viewerUserId);
      if (library.visibility !== "public" && role === null) {
        throw LibraryErrors.libraryNotFound();
      }
      return { library, role };
    },

    async assertLibraryOwnerById(
      libraryId: string,
      actorUserId: string,
      notFoundFactory: () => Error = () => LibraryErrors.libraryNotFound()
    ): Promise<LibraryRecord> {
      const library = await libraryRepo.findById(libraryId);
      if (!library) {
        throw notFoundFactory();
      }
      if (library.owner_id === actorUserId) {
        return library;
      }
      const role = await getRole(library, actorUserId);
      if (library.visibility !== "public" && role === null) {
        throw notFoundFactory();
      }
      throw LibraryErrors.libraryForbidden();
    },

    async getMemberLibraryIds(viewerUserId: string | null): Promise<string[]> {
      if (!viewerUserId) return [];
      return libraryMemberRepo.listLibraryIdsForUser(viewerUserId);
    },
  };
}

export type LibraryAccess = ReturnType<typeof createLibraryAccess>;

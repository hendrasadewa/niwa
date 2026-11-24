import { LibraryErrors } from "../errors/library";
import type {
  BookshelfRecord,
  BookshelfRepo,
} from "../repositories/bookshelves";
import type { LibraryRepo } from "../repositories/libraries";
import type { LibraryMemberRepo } from "../repositories/library-members";
import type { AuthUser } from "../types/auth";
import { createLibraryAccess } from "./library-access";

export type BookshelfServiceDeps = {
  bookshelfRepo: BookshelfRepo;
  libraryRepo: LibraryRepo;
  libraryMemberRepo: LibraryMemberRepo;
};

export function createBookshelfService({
  bookshelfRepo,
  libraryRepo,
  libraryMemberRepo,
}: BookshelfServiceDeps) {
  const access = createLibraryAccess({ libraryRepo, libraryMemberRepo });

  return {
    async listBookshelves(
      actor: AuthUser | null,
      filters: { libraryId?: string } = {}
    ): Promise<BookshelfRecord[]> {
      const viewerId = actor?.id ?? null;

      if (filters.libraryId) {
        const { library } = await access.assertCanViewLibraryByIdOrSlug(
          filters.libraryId,
          viewerId
        );
        return bookshelfRepo.findByLibrary(library.id);
      }

      const memberLibraryIds = await access.getMemberLibraryIds(viewerId);
      return bookshelfRepo.findAccessible({
        viewerUserId: viewerId,
        memberLibraryIds,
      });
    },

    async getBookshelf(
      id: string,
      actor: AuthUser | null
    ): Promise<BookshelfRecord> {
      const shelf = await bookshelfRepo.findById(id);
      if (!shelf) {
        throw LibraryErrors.bookshelfNotFound();
      }

      await access.assertCanViewLibraryById(
        shelf.library_id,
        actor?.id ?? null,
        () => LibraryErrors.bookshelfNotFound()
      );

      return shelf;
    },

    async createBookshelf(
      libraryId: string,
      input: {
        name: string;
        location: string;
      },
      actor: AuthUser
    ): Promise<BookshelfRecord> {
      const library = await access.assertLibraryOwnerById(libraryId, actor.id);

      return bookshelfRepo.create({
        id: crypto.randomUUID(),
        library_id: library.id,
        name: input.name,
        location: input.location,
        created_at: Math.floor(Date.now() / 1000),
      });
    },

    async updateBookshelf(
      id: string,
      updates: {
        name?: string;
        location?: string;
      },
      actor: AuthUser
    ): Promise<BookshelfRecord> {
      const existing = await bookshelfRepo.findById(id);
      if (!existing) {
        throw LibraryErrors.bookshelfNotFound();
      }

      await access.assertLibraryOwnerById(
        existing.library_id,
        actor.id,
        () => LibraryErrors.bookshelfNotFound()
      );

      const updatedFields = {
        name: updates.name ?? existing.name,
        location: updates.location ?? existing.location,
      };

      await bookshelfRepo.update(existing.id, updatedFields);

      return {
        ...existing,
        ...updatedFields,
      };
    },

    async deleteBookshelf(
      id: string,
      actor: AuthUser
    ): Promise<{ id: string }> {
      const existing = await bookshelfRepo.findById(id);
      if (!existing) {
        throw LibraryErrors.bookshelfNotFound();
      }

      await access.assertLibraryOwnerById(
        existing.library_id,
        actor.id,
        () => LibraryErrors.bookshelfNotFound()
      );

      await bookshelfRepo.deleteById(existing.id);
      return { id: existing.id };
    },
  };
}

export type BookshelfService = ReturnType<typeof createBookshelfService>;

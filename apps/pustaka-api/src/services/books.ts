import { LibraryErrors } from "../errors/library";
import type { BookRecord, BookRepo } from "../repositories/books";
import type { BookshelfRepo } from "../repositories/bookshelves";
import type { CoverStorageRepo } from "../repositories/cover-storage";
import type { LibraryRecord, LibraryRepo } from "../repositories/libraries";
import type { LibraryMemberRepo } from "../repositories/library-members";
import type { AuthUser } from "../types/auth";
import type { BookWithShelf } from "../types/library";
import { createLibraryAccess } from "./library-access";

export type BookServiceDeps = {
  bookRepo: BookRepo;
  bookshelfRepo: BookshelfRepo;
  coverStorageRepo: CoverStorageRepo;
  libraryRepo: LibraryRepo;
  libraryMemberRepo: LibraryMemberRepo;
};

export function createBookService({
  bookRepo,
  bookshelfRepo,
  coverStorageRepo,
  libraryRepo,
  libraryMemberRepo,
}: BookServiceDeps) {
  const access = createLibraryAccess({ libraryRepo, libraryMemberRepo });

  async function validateShelfForLibrary(
    bookshelfId: string | null | undefined,
    libraryId: string
  ): Promise<string | null> {
    if (bookshelfId === undefined || bookshelfId === null) {
      return null;
    }

    const shelf = await bookshelfRepo.findById(bookshelfId);
    if (!shelf) {
      throw LibraryErrors.bookshelfNotFound("Target bookshelf does not exist");
    }
    if (shelf.library_id !== libraryId) {
      throw LibraryErrors.bookshelfWrongLibrary();
    }
    return shelf.id;
  }

  async function resolveBookOwnerForCreate(
    library: LibraryRecord,
    actor: AuthUser,
    input: { owner_id?: string | null; owner_name?: string }
  ): Promise<{ owner_id: string | null; owner_name: string }> {
    // Explicit Niwa user owner
    if (typeof input.owner_id === "string" && input.owner_id.length > 0) {
      if (input.owner_id === library.owner_id) {
        return {
          owner_id: library.owner_id,
          owner_name: input.owner_name ?? actor.username ?? library.owner_name,
        };
      }

      const member = await libraryMemberRepo.findByLibraryAndUser(
        library.id,
        input.owner_id
      );
      if (!member) {
        throw LibraryErrors.ownerNotMember();
      }

      return {
        owner_id: member.user_id,
        owner_name: input.owner_name ?? member.username,
      };
    }

    // Explicit non-account owner label (owner_id === null)
    if (input.owner_id === null) {
      if (!input.owner_name) {
        throw LibraryErrors.ownerNameRequired();
      }
      return {
        owner_id: null,
        owner_name: input.owner_name,
      };
    }

    // Label-only shorthand: owner_id omitted but owner_name provided
    if (input.owner_name) {
      return {
        owner_id: null,
        owner_name: input.owner_name,
      };
    }

    // Default: authenticated library owner
    return {
      owner_id: actor.id,
      owner_name: actor.username,
    };
  }

  async function resolveBookOwnerForUpdate(
    library: LibraryRecord,
    existingBook: BookRecord,
    updates: { owner_id?: string | null; owner_name?: string }
  ): Promise<{ owner_id: string | null; owner_name: string }> {
    if (updates.owner_id === undefined && updates.owner_name === undefined) {
      return {
        owner_id: existingBook.owner_id,
        owner_name: existingBook.owner_name,
      };
    }

    if (typeof updates.owner_id === "string" && updates.owner_id.length > 0) {
      if (updates.owner_id === library.owner_id) {
        return {
          owner_id: library.owner_id,
          owner_name: updates.owner_name ?? library.owner_name,
        };
      }

      const member = await libraryMemberRepo.findByLibraryAndUser(
        library.id,
        updates.owner_id
      );
      if (!member) {
        throw LibraryErrors.ownerNotMember();
      }

      return {
        owner_id: member.user_id,
        owner_name: updates.owner_name ?? member.username,
      };
    }

    if (updates.owner_id === null) {
      const nextName = updates.owner_name ?? existingBook.owner_name;
      if (!nextName) {
        throw LibraryErrors.ownerNameRequired();
      }
      return {
        owner_id: null,
        owner_name: nextName,
      };
    }

    return {
      owner_id: existingBook.owner_id,
      owner_name: updates.owner_name ?? existingBook.owner_name,
    };
  }

  return {
    async listBooks(
      actor: AuthUser | null,
      filters: {
        search?: string;
        library_id?: string;
        bookshelf_id?: string;
        owner_id?: string;
        owned_by_me?: boolean;
      }
    ): Promise<BookWithShelf[]> {
      const viewerId = actor?.id ?? null;

      let resolvedLibraryId = filters.library_id;
      if (filters.library_id) {
        const { library } = await access.assertCanViewLibraryByIdOrSlug(
          filters.library_id,
          viewerId
        );
        resolvedLibraryId = library.id;
      }

      if (filters.owned_by_me && !viewerId) {
        return [];
      }

      const memberLibraryIds = await access.getMemberLibraryIds(viewerId);
      const effectiveOwnerId = filters.owned_by_me
        ? viewerId ?? undefined
        : filters.owner_id;

      return bookRepo.findAllWithShelf({
        search: filters.search,
        libraryId: resolvedLibraryId,
        bookshelfId: filters.bookshelf_id,
        ownerId: effectiveOwnerId,
        viewerUserId: viewerId,
        memberLibraryIds,
      });
    },

    async listOwnedByMe(
      actor: AuthUser,
      filters: { search?: string; library_id?: string } = {}
    ): Promise<BookWithShelf[]> {
      return this.listBooks(actor, {
        search: filters.search,
        library_id: filters.library_id,
        owned_by_me: true,
      });
    },

    async getBook(id: string, actor: AuthUser | null): Promise<BookWithShelf> {
      const book = await bookRepo.findByIdWithShelf(id);
      if (!book) {
        throw LibraryErrors.bookNotFound();
      }

      await access.assertCanViewLibraryById(
        book.library_id,
        actor?.id ?? null,
        () => LibraryErrors.bookNotFound()
      );

      return book;
    },

    async createBook(
      libraryId: string,
      input: {
        title: string;
        author: string;
        isbn: string;
        total_pages: number;
        cover_image_key?: string | null;
        bookshelf_id?: string | null;
        owner_id?: string | null;
        owner_name?: string;
      },
      actor: AuthUser
    ): Promise<BookRecord> {
      const library = await access.assertLibraryOwnerById(libraryId, actor.id);

      const resolvedBookshelfId = await validateShelfForLibrary(
        input.bookshelf_id,
        library.id
      );

      const resolvedOwner = await resolveBookOwnerForCreate(
        library,
        actor,
        input
      );

      return bookRepo.create({
        id: crypto.randomUUID(),
        library_id: library.id,
        title: input.title,
        author: input.author,
        isbn: input.isbn,
        total_pages: input.total_pages,
        cover_image_key: input.cover_image_key ?? null,
        bookshelf_id: resolvedBookshelfId,
        owner_id: resolvedOwner.owner_id,
        owner_name: resolvedOwner.owner_name,
        created_at: Math.floor(Date.now() / 1000),
      });
    },

    async updateBook(
      id: string,
      updates: {
        title?: string;
        author?: string;
        isbn?: string;
        total_pages?: number;
        bookshelf_id?: string | null;
        owner_id?: string | null;
        owner_name?: string;
      },
      actor: AuthUser
    ): Promise<BookRecord> {
      const existingBook = await bookRepo.findById(id);
      if (!existingBook) {
        throw LibraryErrors.bookNotFound();
      }

      const library = await access.assertLibraryOwnerById(
        existingBook.library_id,
        actor.id,
        () => LibraryErrors.bookNotFound()
      );

      const nextBookshelfId =
        updates.bookshelf_id !== undefined
          ? await validateShelfForLibrary(updates.bookshelf_id, library.id)
          : existingBook.bookshelf_id;

      const resolvedOwner = await resolveBookOwnerForUpdate(
        library,
        existingBook,
        updates
      );

      const updatedFields = {
        title: updates.title ?? existingBook.title,
        author: updates.author ?? existingBook.author,
        isbn: updates.isbn ?? existingBook.isbn,
        total_pages: updates.total_pages ?? existingBook.total_pages,
        bookshelf_id: nextBookshelfId,
        owner_id: resolvedOwner.owner_id,
        owner_name: resolvedOwner.owner_name,
      };

      await bookRepo.update(id, updatedFields);

      return {
        ...existingBook,
        ...updatedFields,
      };
    },

    async moveBook(
      id: string,
      bookshelfId: string | null,
      actor: AuthUser
    ): Promise<BookRecord> {
      const existingBook = await bookRepo.findById(id);
      if (!existingBook) {
        throw LibraryErrors.bookNotFound();
      }

      const library = await access.assertLibraryOwnerById(
        existingBook.library_id,
        actor.id,
        () => LibraryErrors.bookNotFound()
      );

      const nextBookshelfId = await validateShelfForLibrary(
        bookshelfId,
        library.id
      );

      await bookRepo.updateLocation(id, nextBookshelfId);

      return {
        ...existingBook,
        bookshelf_id: nextBookshelfId,
      };
    },

    async deleteBook(id: string, actor: AuthUser): Promise<{ id: string }> {
      const existingBook = await bookRepo.findById(id);
      if (!existingBook) {
        throw LibraryErrors.bookNotFound();
      }

      await access.assertLibraryOwnerById(
        existingBook.library_id,
        actor.id,
        () => LibraryErrors.bookNotFound()
      );

      if (existingBook.cover_image_key) {
        await coverStorageRepo.delete(existingBook.cover_image_key);
      }

      await bookRepo.deleteById(id);
      return { id };
    },
  };
}

export type BookService = ReturnType<typeof createBookService>;

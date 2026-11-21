import { LibraryErrors } from "../errors/library";
import type { BookRecord, BookRepo } from "../repositories/books";
import type { BookshelfRepo } from "../repositories/bookshelves";
import type { CoverStorageRepo } from "../repositories/cover-storage";
import type { BookWithShelf } from "../types/library";

export type BookServiceDeps = {
  bookRepo: BookRepo;
  bookshelfRepo: BookshelfRepo;
  coverStorageRepo: CoverStorageRepo;
};

export function createBookService({
  bookRepo,
  bookshelfRepo,
  coverStorageRepo,
}: BookServiceDeps) {
  return {
    async listBooks(filters: {
      search?: string;
      bookshelf_id?: string;
    }): Promise<BookWithShelf[]> {
      return bookRepo.findAllWithShelf({
        search: filters.search,
        bookshelfId: filters.bookshelf_id,
      });
    },

    async getBook(id: string): Promise<BookWithShelf> {
      const book = await bookRepo.findByIdWithShelf(id);
      if (!book) {
        throw LibraryErrors.bookNotFound();
      }
      return book;
    },

    async createBook(input: {
      title: string;
      author: string;
      isbn: string;
      total_pages: number;
      cover_image_key?: string | null;
      bookshelf_id: string;
    }): Promise<BookRecord> {
      const shelf = await bookshelfRepo.findById(input.bookshelf_id);
      if (!shelf) {
        throw LibraryErrors.bookshelfNotFound(
          "Target bookshelf does not exist"
        );
      }

      const existingIsbn = await bookRepo.findByIsbn(input.isbn);
      if (existingIsbn) {
        throw LibraryErrors.isbnAlreadyExists();
      }

      return bookRepo.create({
        id: crypto.randomUUID(),
        title: input.title,
        author: input.author,
        isbn: input.isbn,
        total_pages: input.total_pages,
        cover_image_key: input.cover_image_key ?? null,
        bookshelf_id: input.bookshelf_id,
      });
    },

    async updateBook(
      id: string,
      updates: {
        title?: string;
        author?: string;
        isbn?: string;
        total_pages?: number;
        bookshelf_id?: string;
      }
    ): Promise<BookRecord> {
      const existingBook = await bookRepo.findById(id);
      if (!existingBook) {
        throw LibraryErrors.bookNotFound();
      }

      if (updates.bookshelf_id) {
        const shelf = await bookshelfRepo.findById(updates.bookshelf_id);
        if (!shelf) {
          throw LibraryErrors.bookshelfNotFound(
            "Target bookshelf does not exist"
          );
        }
      }

      if (updates.isbn && updates.isbn !== existingBook.isbn) {
        const duplicateIsbn = await bookRepo.findByIsbn(updates.isbn);
        if (duplicateIsbn) {
          throw LibraryErrors.isbnAlreadyExists();
        }
      }

      const updatedFields = {
        title: updates.title ?? existingBook.title,
        author: updates.author ?? existingBook.author,
        isbn: updates.isbn ?? existingBook.isbn,
        total_pages: updates.total_pages ?? existingBook.total_pages,
        bookshelf_id: updates.bookshelf_id ?? existingBook.bookshelf_id,
      };

      await bookRepo.update(id, updatedFields);

      return {
        ...existingBook,
        ...updatedFields,
      };
    },

    async moveBook(id: string, bookshelfId: string): Promise<BookRecord> {
      const existingBook = await bookRepo.findById(id);
      if (!existingBook) {
        throw LibraryErrors.bookNotFound();
      }

      const shelf = await bookshelfRepo.findById(bookshelfId);
      if (!shelf) {
        throw LibraryErrors.bookshelfNotFound(
          "Target bookshelf does not exist"
        );
      }

      await bookRepo.updateLocation(id, bookshelfId);

      return {
        ...existingBook,
        bookshelf_id: bookshelfId,
      };
    },

    async deleteBook(id: string): Promise<{ id: string }> {
      const existingBook = await bookRepo.findById(id);
      if (!existingBook) {
        throw LibraryErrors.bookNotFound();
      }

      if (existingBook.cover_image_key) {
        await coverStorageRepo.delete(existingBook.cover_image_key);
      }

      await bookRepo.deleteById(id);
      return { id };
    },
  };
}

export type BookService = ReturnType<typeof createBookService>;

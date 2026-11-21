import { LibraryErrors } from "../errors/library";
import type {
  BookshelfRecord,
  BookshelfRepo,
} from "../repositories/bookshelves";

export type BookshelfServiceDeps = {
  bookshelfRepo: BookshelfRepo;
};

export function createBookshelfService({
  bookshelfRepo,
}: BookshelfServiceDeps) {
  return {
    async listBookshelves(): Promise<BookshelfRecord[]> {
      return bookshelfRepo.findAll();
    },

    async getBookshelf(id: string): Promise<BookshelfRecord> {
      const shelf = await bookshelfRepo.findById(id);
      if (!shelf) {
        throw LibraryErrors.bookshelfNotFound();
      }
      return shelf;
    },

    async createBookshelf(input: {
      name: string;
      location: string;
    }): Promise<BookshelfRecord> {
      return bookshelfRepo.create({
        id: crypto.randomUUID(),
        name: input.name,
        location: input.location,
      });
    },
  };
}

export type BookshelfService = ReturnType<typeof createBookshelfService>;

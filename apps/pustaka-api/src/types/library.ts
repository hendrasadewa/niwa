export type BookshelfSummary = {
  id: string;
  name: string;
  location: string;
};

export type BookWithShelf = {
  id: string;
  title: string;
  author: string;
  isbn: string;
  total_pages: number;
  cover_image_key: string | null;
  bookshelf_id: string;
  bookshelf: BookshelfSummary | null;
};

export type BookReviewResponse = {
  id: string;
  user_id: string;
  username: string;
  book_id: string;
  rating: number;
  review_text: string;
};

export type ReadingListWithBook = {
  id: string;
  user_id: string;
  book_id: string;
  status: string;
  updated_at: number;
  book: {
    id: string;
    title: string;
    author: string;
    isbn: string;
    total_pages: number;
    cover_image_key: string | null;
    bookshelf_id: string;
  };
};

export type ReadingProgressResponse = {
  id: string | null;
  user_id: string;
  book_id: string;
  last_page_read: number;
  total_pages: number;
  percentage: number;
  updated_at: number | null;
};

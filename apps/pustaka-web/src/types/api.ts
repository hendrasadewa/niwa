import type { ReadingStatus } from "@niwa/pustaka-validators";

export type { ReadingStatus };

export interface User {
  id: string;
  username: string;
  email: string;
  roles: string[];
  permissions: string[];
  created_at?: number;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface ProfileResponse {
  user: User;
}

export interface Bookshelf {
  id: string;
  name: string;
  location: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  total_pages: number;
  cover_image_key: string | null;
  bookshelf_id: string;
  bookshelf?: Bookshelf | null;
}

export interface ReadingListItem {
  id: string;
  user_id: string;
  book_id: string;
  status: ReadingStatus;
  updated_at: number;
  book: Book;
}

export interface ReadingProgress {
  id: string | null;
  user_id: string;
  book_id: string;
  last_page_read: number;
  total_pages: number;
  percentage: number;
  updated_at: number | null;
}

export interface BookReview {
  id: string;
  user_id: string;
  username?: string;
  book_id: string;
  rating: number;
  review_text: string;
}

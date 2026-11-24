import type { LibraryVisibility } from "@niwa/pustaka-validators";

export type LibraryRole = "owner" | "member";

export type LibrarySummary = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  owner_id: string;
  owner_name: string;
  visibility: LibraryVisibility;
  created_at: number;
  updated_at: number;
};

export type LibraryWithMeta = LibrarySummary & {
  role: LibraryRole | null;
  book_count: number;
  bookshelf_count: number;
  member_count: number;
};

export type LibraryMemberResponse = {
  id: string;
  library_id: string;
  user_id: string;
  username: string;
  joined_at: number;
};

export type LibraryInviteResponse = {
  id: string;
  library_id: string;
  code: string;
  created_by: string;
  max_uses: number | null;
  uses_count: number;
  expires_at: number | null;
  revoked_at: number | null;
  created_at: number;
};

export type InvitePreviewResponse = {
  code: string;
  is_active: boolean;
  expires_at: number | null;
  max_uses: number | null;
  uses_count: number;
  library: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    owner_name: string;
    visibility: LibraryVisibility;
  };
};

export type BookshelfSummary = {
  id: string;
  library_id: string;
  name: string;
  location: string;
  created_at: number;
};

export type BookLibrarySummary = {
  id: string;
  name: string;
  slug: string;
  visibility: LibraryVisibility;
};

export type BookWithShelf = {
  id: string;
  library_id: string;
  title: string;
  author: string;
  isbn: string;
  total_pages: number;
  cover_image_key: string | null;
  bookshelf_id: string | null;
  owner_id: string | null;
  owner_name: string;
  created_at: number;
  bookshelf: BookshelfSummary | null;
  library: BookLibrarySummary | null;
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
    library_id: string;
    title: string;
    author: string;
    isbn: string;
    total_pages: number;
    cover_image_key: string | null;
    bookshelf_id: string | null;
    owner_id: string | null;
    owner_name: string;
    created_at: number;
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

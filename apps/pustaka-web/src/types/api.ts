import type {
  LibraryVisibility,
  ReadingStatus,
} from "@niwa/pustaka-validators";

export type { LibraryVisibility, ReadingStatus };

export type LibraryRole = "owner" | "member";

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
  refresh_token?: string;
  expires_in?: number;
}

export interface ChangePasswordResponse {
  message: string;
  user: User;
  token: string;
  refresh_token?: string;
  expires_in?: number;
}

export interface ProfileResponse {
  user: User;
}

export interface Library {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  owner_id: string;
  owner_name: string;
  visibility: LibraryVisibility;
  created_at: number;
  updated_at: number;
  role: LibraryRole | null;
  book_count: number;
  bookshelf_count: number;
  member_count: number;
}

export interface LibraryMember {
  id: string;
  library_id: string;
  user_id: string;
  username: string;
  joined_at: number;
}

export interface LibraryMembersResponse {
  owner: {
    user_id: string;
    username: string;
  };
  members: LibraryMember[];
}

export interface LibraryInvite {
  id: string;
  library_id: string;
  code: string;
  created_by: string;
  max_uses: number | null;
  uses_count: number;
  expires_at: number | null;
  revoked_at: number | null;
  created_at: number;
}

export interface InvitePreview {
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
}

export interface Bookshelf {
  id: string;
  library_id: string;
  name: string;
  location: string;
  created_at?: number;
}

export interface BookLibrarySummary {
  id: string;
  name: string;
  slug: string;
  visibility: LibraryVisibility;
}

export interface Book {
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
  created_at?: number;
  bookshelf?: Bookshelf | null;
  library?: BookLibrarySummary | null;
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

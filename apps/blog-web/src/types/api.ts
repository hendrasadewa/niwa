export interface BlogUser {
  id: string;
  username: string;
  email: string;
  roles: string[];
  permissions: string[];
  created_at?: number;
}

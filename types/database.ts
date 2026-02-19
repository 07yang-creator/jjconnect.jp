/**
 * Database Type Definitions
 * Auto-generated TypeScript interfaces for Supabase tables
 */

// ============================================================================
// ENUMS
// ============================================================================

export type PostStatus = 'draft' | 'published';

// ============================================================================
// BASE TABLE INTERFACES
// ============================================================================

/**
 * Global Categories Table
 * Used for global article categorization
 */
export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * User Profiles Table
 * Extends auth.users with additional profile information
 */
export interface Profile {
  id: string; // References auth.users.id
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_authorized: boolean; // Admin/authorized user flag
  created_at: string;
  updated_at: string;
}

/**
 * Posts Table
 * Core article/content table with paid content support
 */
export interface Post {
  id: string;
  title: string;
  content: PostContent; // JSONB field
  summary: string | null;
  cover_image: string | null;
  category_id: string | null;
  author_id: string;
  is_paid: boolean;
  price: number; // Decimal as number in TypeScript
  status: PostStatus;
  created_at: string;
  updated_at: string;
}

/**
 * User Categories Table
 * Custom categories created by authorized users for their homepage
 */
export interface UserCategory {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// CONTENT TYPE DEFINITIONS
// ============================================================================

/**
 * Post Content Structure (JSONB)
 * Flexible content format - can be extended based on your editor choice
 */
export interface PostContent {
  // For rich text editors like TipTap, Slate, or ProseMirror
  type?: 'doc' | 'text' | 'html';
  content?: Array<{
    type: string;
    attrs?: Record<string, any>;
    content?: any[];
    text?: string;
  }>;
  
  // Alternative: plain HTML string
  html?: string;
  
  // Alternative: Markdown
  markdown?: string;
  
  // Alternative: blocks-based (like Notion, Editor.js)
  blocks?: Array<{
    id: string;
    type: string;
    data: Record<string, any>;
  }>;
}

// ============================================================================
// EXTENDED INTERFACES WITH RELATIONS
// ============================================================================

/**
 * Post with author and category information
 */
export interface PostWithRelations extends Post {
  author?: Profile;
  category?: Category;
}

/**
 * Post with full relations including user categories
 */
export interface PostWithFullRelations extends PostWithRelations {
  user_categories?: UserCategory[];
}

/**
 * Profile with their posts
 */
export interface ProfileWithPosts extends Profile {
  posts?: Post[];
}

/**
 * Category with post count
 */
export interface CategoryWithCount extends Category {
  post_count?: number;
}

/**
 * User Category with post count
 */
export interface UserCategoryWithCount extends UserCategory {
  post_count?: number;
}

// ============================================================================
// INSERT/UPDATE TYPE HELPERS
// ============================================================================

/**
 * Type for inserting a new category
 * Omits auto-generated fields
 */
export type CategoryInsert = Omit<Category, 'id' | 'created_at' | 'updated_at'>;

/**
 * Type for updating a category
 * All fields optional except constraints
 */
export type CategoryUpdate = Partial<Omit<Category, 'id' | 'created_at' | 'updated_at'>>;

/**
 * Type for inserting a new profile
 * Omits auto-generated fields and defaults
 */
export type ProfileInsert = Omit<Profile, 'created_at' | 'updated_at' | 'is_authorized'> & {
  is_authorized?: boolean;
};

/**
 * Type for updating a profile
 * All fields optional except id
 */
export type ProfileUpdate = Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>;

/**
 * Type for inserting a new post
 * Omits auto-generated fields and sets defaults
 */
export type PostInsert = Omit<Post, 'id' | 'created_at' | 'updated_at'> & {
  is_paid?: boolean;
  price?: number;
  status?: PostStatus;
  summary?: string | null;
  cover_image?: string | null;
  category_id?: string | null;
};

/**
 * Type for updating a post
 * All fields optional except constraints
 */
export type PostUpdate = Partial<Omit<Post, 'id' | 'author_id' | 'created_at' | 'updated_at'>>;

/**
 * Type for inserting a new user category
 * Omits auto-generated fields
 */
export type UserCategoryInsert = Omit<UserCategory, 'id' | 'created_at' | 'updated_at'>;

/**
 * Type for updating a user category
 * All fields optional except constraints
 */
export type UserCategoryUpdate = Partial<Omit<UserCategory, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;

// ============================================================================
// QUERY FILTER TYPES
// ============================================================================

/**
 * Filters for querying posts
 */
export interface PostFilters {
  status?: PostStatus | PostStatus[];
  author_id?: string;
  category_id?: string;
  is_paid?: boolean;
  search?: string; // For title/summary search
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

/**
 * Sort parameters
 */
export interface SortParams {
  column: string;
  order: 'asc' | 'desc';
}

/**
 * Complete query parameters
 */
export interface QueryParams extends PaginationParams {
  sort?: SortParams;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    total_pages?: number;
  };
}

/**
 * API Error structure
 */
export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

// ============================================================================
// SUPABASE-SPECIFIC TYPES
// ============================================================================

/**
 * Supabase Database schema
 * Used with Supabase client type generation
 */
export interface Database {
  public: {
    Tables: {
      categories: {
        Row: Category;
        Insert: CategoryInsert;
        Update: CategoryUpdate;
      };
      profiles: {
        Row: Profile;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
      };
      posts: {
        Row: Post;
        Insert: PostInsert;
        Update: PostUpdate;
      };
      user_categories: {
        Row: UserCategory;
        Insert: UserCategoryInsert;
        Update: UserCategoryUpdate;
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
    };
    Enums: {
      post_status: PostStatus;
    };
  };
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Extract table names from database
 */
export type TableName = keyof Database['public']['Tables'];

/**
 * Extract row type from table name
 */
export type TableRow<T extends TableName> = Database['public']['Tables'][T]['Row'];

/**
 * Extract insert type from table name
 */
export type TableInsert<T extends TableName> = Database['public']['Tables'][T]['Insert'];

/**
 * Extract update type from table name
 */
export type TableUpdate<T extends TableName> = Database['public']['Tables'][T]['Update'];

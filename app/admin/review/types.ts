import type { PostContent } from '@/types/database';

export interface ReviewPost {
  id: string;
  title: string;
  category_id: string | null;
  cover_image: string | null;
  created_at: string;
  content: PostContent;
  author?: {
    display_name: string | null;
    avatar_url: string | null;
  } | null;
  category?: {
    name: string;
    slug: string;
  } | null;
}

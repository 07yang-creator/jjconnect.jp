/**
 * RightSidebar 组件相关类型定义
 */

import type { Category, Profile } from '@/types/database';

// ============================================================================
// 组件 Props 类型
// ============================================================================

/**
 * Cloudflare Workers / Next.js 环境变量
 */
export interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
}

/**
 * 简化的用户信息
 */
export interface User {
  id: string;
  email?: string;
  phone?: string;
}

/**
 * RightSidebar 组件属性
 */
export interface RightSidebarProps {
  /** Supabase 环境变量配置 */
  env: Env;
  /** 当前登录用户（可选） */
  user?: User | null;
  /** 自定义类名 */
  className?: string;
  /** 是否显示搜索栏 */
  showSearch?: boolean;
  /** 是否显示分类 */
  showCategories?: boolean;
  /** 是否显示授权用户入口 */
  showAdminAccess?: boolean;
  /** 是否显示登录提示 */
  showLoginPrompt?: boolean;
}

// ============================================================================
// 内部状态类型
// ============================================================================

/**
 * 用户资料（包含授权状态）
 */
export interface UserProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_authorized: boolean;
}

/**
 * 搜索建议项
 */
export interface SearchSuggestion {
  id: string;
  title: string;
  type: 'post' | 'category' | 'user';
  url: string;
}

/**
 * 分类统计信息
 */
export interface CategoryWithStats extends Category {
  post_count?: number;
  active_users?: number;
}

// ============================================================================
// 导航项类型
// ============================================================================

/**
 * 导航链接项
 */
export interface NavigationLink {
  /** 链接文本 */
  label: string;
  /** 链接地址 */
  href: string;
  /** 图标（SVG 字符串或组件） */
  icon?: React.ReactNode;
  /** 图标颜色类 */
  iconColor?: string;
  /** 悬停背景色类 */
  hoverBgColor?: string;
  /** 悬停文字色类 */
  hoverTextColor?: string;
  /** 徽章数字（如通知数） */
  badge?: number;
  /** 是否在新窗口打开 */
  external?: boolean;
  /** 提示文本 */
  title?: string;
}

/**
 * 导航分组
 */
export interface NavigationSection {
  /** 分组标题 */
  title: string;
  /** 导航链接列表 */
  links: NavigationLink[];
  /** 是否显示该分组 */
  visible?: boolean;
}

// ============================================================================
// 事件处理类型
// ============================================================================

/**
 * 搜索事件参数
 */
export interface SearchEventData {
  query: string;
  timestamp: Date;
}

/**
 * 分类点击事件参数
 */
export interface CategoryClickEventData {
  category: Category;
  timestamp: Date;
}

/**
 * 导航点击事件参数
 */
export interface NavigationClickEventData {
  link: NavigationLink;
  timestamp: Date;
}

// ============================================================================
// 配置类型
// ============================================================================

/**
 * RightSidebar 配置选项
 */
export interface RightSidebarConfig {
  /** 边栏宽度（像素） */
  width?: number;
  /** 背景透明度 (0-1) */
  bgOpacity?: number;
  /** 模糊强度（像素） */
  blurStrength?: number;
  /** 是否启用动画 */
  enableAnimations?: boolean;
  /** 是否启用缓存 */
  enableCache?: boolean;
  /** 缓存过期时间（毫秒） */
  cacheExpiry?: number;
  /** 自定义颜色主题 */
  theme?: {
    primary?: string;
    secondary?: string;
    accent?: string;
    background?: string;
    text?: string;
  };
}

/**
 * 移动端配置
 */
export interface MobileConfig {
  /** 是否显示底部导航栏 */
  showBottomNav?: boolean;
  /** 底部导航栏高度（像素） */
  bottomNavHeight?: number;
  /** 是否启用分类模态框 */
  enableCategoryModal?: boolean;
  /** 断点尺寸（像素） */
  breakpoint?: number;
}

// ============================================================================
// API 响应类型
// ============================================================================

/**
 * 获取分类列表的响应
 */
export interface FetchCategoriesResponse {
  data: Category[] | null;
  error: Error | null;
}

/**
 * 获取用户资料的响应
 */
export interface FetchProfileResponse {
  data: UserProfile | null;
  error: Error | null;
}

/**
 * 搜索建议响应
 */
export interface SearchSuggestionsResponse {
  data: SearchSuggestion[] | null;
  error: Error | null;
}

// ============================================================================
// Hooks 类型
// ============================================================================

/**
 * useRightSidebar Hook 返回类型
 */
export interface UseRightSidebarReturn {
  /** 分类列表 */
  categories: Category[];
  /** 用户资料 */
  userProfile: UserProfile | null;
  /** 是否加载中 */
  isLoading: boolean;
  /** 错误信息 */
  error: Error | null;
  /** 搜索查询 */
  searchQuery: string;
  /** 设置搜索查询 */
  setSearchQuery: (query: string) => void;
  /** 执行搜索 */
  handleSearch: (e: React.FormEvent) => void;
  /** 刷新数据 */
  refresh: () => Promise<void>;
}

/**
 * useCategories Hook 返回类型
 */
export interface UseCategoriesReturn {
  categories: Category[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

/**
 * useUserProfile Hook 返回类型
 */
export interface UseUserProfileReturn {
  profile: UserProfile | null;
  isLoading: boolean;
  error: Error | null;
  isAuthorized: boolean;
  refresh: () => Promise<void>;
}

// ============================================================================
// 工具类型
// ============================================================================

/**
 * 深度部分类型
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * 只读递归类型
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

/**
 * 可选字段类型
 */
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * 必选字段类型
 */
export type Required<T, K extends keyof T> = T & { [P in K]-?: T[P] };

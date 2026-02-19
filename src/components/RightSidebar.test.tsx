/**
 * RightSidebar 组件单元测试
 * 
 * 使用 Jest + React Testing Library
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import RightSidebar from './RightSidebar';
import type { Env, User } from './RightSidebar.types';

// ============================================================================
// Mock 数据
// ============================================================================

const mockEnv: Env = {
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_ANON_KEY: 'test-anon-key',
};

const mockUser: User = {
  id: 'user-123',
  email: 'test@example.com',
};

const mockCategories = [
  {
    id: '1',
    name: '技术',
    slug: 'tech',
    description: '技术相关话题',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    name: '生活',
    slug: 'life',
    description: '生活相关话题',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

const mockProfile = {
  id: 'user-123',
  display_name: '测试用户',
  avatar_url: null,
  bio: null,
  is_authorized: true,
};

// ============================================================================
// Mock Supabase
// ============================================================================

jest.mock('@/src/lib/supabase', () => ({
  getSupabaseClient: jest.fn(() => ({
    from: jest.fn((table: string) => ({
      select: jest.fn(() => ({
        order: jest.fn(() => ({
          then: jest.fn((callback) =>
            callback({
              data: table === 'categories' ? mockCategories : null,
              error: null,
            })
          ),
        })),
        eq: jest.fn(() => ({
          single: jest.fn(() => ({
            then: jest.fn((callback) =>
              callback({
                data: mockProfile,
                error: null,
              })
            ),
          })),
        })),
      })),
    })),
  })),
}));

// ============================================================================
// 测试套件
// ============================================================================

describe('RightSidebar 组件', () => {
  
  // --------------------------------------------------------------------------
  // 基础渲染测试
  // --------------------------------------------------------------------------

  describe('基础渲染', () => {
    it('应该正确渲染桌面端边栏', () => {
      render(<RightSidebar env={mockEnv} user={null} />);
      
      // 检查搜索栏标题
      expect(screen.getByText('搜索')).toBeInTheDocument();
      
      // 检查官方板块标题
      expect(screen.getByText('官方板块')).toBeInTheDocument();
    });

    it('应该在移动端显示底部导航栏', () => {
      render(<RightSidebar env={mockEnv} user={null} />);
      
      // 检查底部导航项
      expect(screen.getByText('首页')).toBeInTheDocument();
      expect(screen.getByText('分类')).toBeInTheDocument();
      expect(screen.getByText('搜索')).toBeInTheDocument();
    });

    it('应该正确应用透明和模糊样式', () => {
      const { container } = render(<RightSidebar env={mockEnv} user={null} />);
      
      const sidebar = container.querySelector('aside');
      expect(sidebar).toHaveClass('bg-white/80');
      expect(sidebar).toHaveClass('backdrop-blur-md');
    });
  });

  // --------------------------------------------------------------------------
  // 搜索功能测试
  // --------------------------------------------------------------------------

  describe('搜索功能', () => {
    it('应该渲染搜索输入框', () => {
      render(<RightSidebar env={mockEnv} user={null} />);
      
      const searchInput = screen.getByPlaceholderText('搜索内容...');
      expect(searchInput).toBeInTheDocument();
    });

    it('应该能够输入搜索内容', () => {
      render(<RightSidebar env={mockEnv} user={null} />);
      
      const searchInput = screen.getByPlaceholderText('搜索内容...') as HTMLInputElement;
      fireEvent.change(searchInput, { target: { value: '测试搜索' } });
      
      expect(searchInput.value).toBe('测试搜索');
    });

    it('应该在提交时跳转到搜索页面', () => {
      // Mock window.location.href
      delete (window as any).location;
      (window as any).location = { href: '' };

      render(<RightSidebar env={mockEnv} user={null} />);
      
      const searchInput = screen.getByPlaceholderText('搜索内容...') as HTMLInputElement;
      const form = searchInput.closest('form');
      
      fireEvent.change(searchInput, { target: { value: '测试' } });
      fireEvent.submit(form!);
      
      expect(window.location.href).toContain('/search?q=测试');
    });

    it('空搜索不应跳转', () => {
      delete (window as any).location;
      (window as any).location = { href: '' };

      render(<RightSidebar env={mockEnv} user={null} />);
      
      const searchInput = screen.getByPlaceholderText('搜索内容...') as HTMLInputElement;
      const form = searchInput.closest('form');
      
      fireEvent.submit(form!);
      
      expect(window.location.href).toBe('');
    });
  });

  // --------------------------------------------------------------------------
  // 分类显示测试
  // --------------------------------------------------------------------------

  describe('分类显示', () => {
    it('应该加载并显示分类列表', async () => {
      render(<RightSidebar env={mockEnv} user={null} />);
      
      await waitFor(() => {
        expect(screen.getByText('技术')).toBeInTheDocument();
        expect(screen.getByText('生活')).toBeInTheDocument();
      });
    });

    it('分类链接应该正确', async () => {
      render(<RightSidebar env={mockEnv} user={null} />);
      
      await waitFor(() => {
        const techLink = screen.getByText('技术').closest('a');
        expect(techLink).toHaveAttribute('href', '/category/tech');
      });
    });

    it('应该显示分类描述为 title', async () => {
      render(<RightSidebar env={mockEnv} user={null} />);
      
      await waitFor(() => {
        const techLink = screen.getByText('技术').closest('a');
        expect(techLink).toHaveAttribute('title', '技术相关话题');
      });
    });
  });

  // --------------------------------------------------------------------------
  // 用户状态测试
  // --------------------------------------------------------------------------

  describe('用户状态显示', () => {
    it('未登录时应显示登录提示', () => {
      render(<RightSidebar env={mockEnv} user={null} />);
      
      expect(screen.getByText('加入我们')).toBeInTheDocument();
      expect(screen.getByText('立即登录')).toBeInTheDocument();
    });

    it('已登录且已授权应显示管理入口', async () => {
      render(<RightSidebar env={mockEnv} user={mockUser} />);
      
      await waitFor(() => {
        expect(screen.getByText('管理中心')).toBeInTheDocument();
        expect(screen.getByText('我的管理主页')).toBeInTheDocument();
      });
    });

    it('管理入口链接应该正确', async () => {
      render(<RightSidebar env={mockEnv} user={mockUser} />);
      
      await waitFor(() => {
        const dashboardLink = screen.getByText('我的管理主页').closest('a');
        expect(dashboardLink).toHaveAttribute('href', '/dashboard');
      });
    });

    it('未授权用户不应显示管理入口', async () => {
      // Mock 未授权的 profile
      jest.mock('@/src/lib/supabase', () => ({
        getSupabaseClient: jest.fn(() => ({
          from: jest.fn(() => ({
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => ({
                  data: { ...mockProfile, is_authorized: false },
                  error: null,
                })),
              })),
            })),
          })),
        })),
      }));

      render(<RightSidebar env={mockEnv} user={mockUser} />);
      
      await waitFor(() => {
        expect(screen.queryByText('管理中心')).not.toBeInTheDocument();
      });
    });
  });

  // --------------------------------------------------------------------------
  // 响应式设计测试
  // --------------------------------------------------------------------------

  describe('响应式设计', () => {
    it('桌面端应隐藏底部导航栏', () => {
      const { container } = render(<RightSidebar env={mockEnv} user={null} />);
      
      const bottomNav = container.querySelector('nav.md\\:hidden');
      expect(bottomNav).toHaveClass('md:hidden');
    });

    it('移动端应隐藏右侧边栏', () => {
      const { container } = render(<RightSidebar env={mockEnv} user={null} />);
      
      const sidebar = container.querySelector('aside');
      expect(sidebar).toHaveClass('hidden');
      expect(sidebar).toHaveClass('md:block');
    });

    it('应该能打开移动端分类模态框', () => {
      render(<RightSidebar env={mockEnv} user={null} />);
      
      const categoryButton = screen.getByText('分类').closest('button');
      const modal = document.getElementById('mobile-categories-modal');
      
      expect(modal).toHaveClass('hidden');
      
      fireEvent.click(categoryButton!);
      
      expect(modal).not.toHaveClass('hidden');
    });
  });

  // --------------------------------------------------------------------------
  // 加载状态测试
  // --------------------------------------------------------------------------

  describe('加载状态', () => {
    it('加载时应显示加载指示器', () => {
      render(<RightSidebar env={mockEnv} user={null} />);
      
      // 在数据加载完成前应该有加载指示器
      const loader = document.querySelector('.animate-spin');
      expect(loader).toBeInTheDocument();
    });

    it('加载完成后应隐藏加载指示器', async () => {
      render(<RightSidebar env={mockEnv} user={null} />);
      
      await waitFor(() => {
        const loader = document.querySelector('.animate-spin');
        expect(loader).not.toBeInTheDocument();
      });
    });
  });

  // --------------------------------------------------------------------------
  // 错误处理测试
  // --------------------------------------------------------------------------

  describe('错误处理', () => {
    it('API 错误时应该优雅降级', async () => {
      // Mock API 错误
      jest.mock('@/src/lib/supabase', () => ({
        getSupabaseClient: jest.fn(() => ({
          from: jest.fn(() => ({
            select: jest.fn(() => ({
              order: jest.fn(() => ({
                then: jest.fn((callback) =>
                  callback({
                    data: null,
                    error: new Error('API Error'),
                  })
                ),
              })),
            })),
          })),
        })),
      }));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      render(<RightSidebar env={mockEnv} user={null} />);

      await waitFor(() => {
        // 应该记录错误但不崩溃
        expect(consoleSpy).toHaveBeenCalled();
      });

      consoleSpy.mockRestore();
    });
  });

  // --------------------------------------------------------------------------
  // 可访问性测试
  // --------------------------------------------------------------------------

  describe('可访问性', () => {
    it('搜索按钮应有 aria-label', () => {
      render(<RightSidebar env={mockEnv} user={null} />);
      
      const searchButton = screen.getByLabelText('搜索');
      expect(searchButton).toBeInTheDocument();
    });

    it('导航链接应有 title 属性', async () => {
      render(<RightSidebar env={mockEnv} user={mockUser} />);
      
      await waitFor(() => {
        const dashboardLink = screen.getByTitle('我的管理主页');
        expect(dashboardLink).toBeInTheDocument();
      });
    });
  });

});

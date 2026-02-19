/**
 * Right Sidebar JavaScript Module
 * Dynamically loads categories and featured content from Supabase
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ============================================================================
// DATA FETCHING
// ============================================================================

async function loadCategories() {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Failed to load categories:', error);
    return [];
  }
}

async function loadFeaturedPosts() {
  try {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        id,
        title,
        price,
        cover_image,
        author:profiles(display_name, avatar_url)
      `)
      .eq('status', 'published')
      .eq('is_paid', true)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Failed to load featured posts:', error);
    return [];
  }
}

async function checkUserAuth() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { isLoggedIn: false, isAuthorized: false };

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_authorized')
      .eq('id', user.id)
      .single();
    
    return {
      isLoggedIn: true,
      isAuthorized: profile?.is_authorized || false,
      user
    };
  } catch (error) {
    console.error('Failed to check auth:', error);
    return { isLoggedIn: false, isAuthorized: false };
  }
}

// ============================================================================
// RENDER FUNCTIONS
// ============================================================================

function renderCategories(categories) {
  const categoriesList = document.getElementById('categories-list');
  if (!categoriesList) return;

  if (categories.length === 0) {
    document.getElementById('categories-section')?.classList.add('hidden');
    return;
  }

  categoriesList.innerHTML = categories.map(category => `
    <a
      href="/category/${category.slug}"
      class="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-700 hover:text-gray-900 transition-colors group"
      title="${category.description || category.name}"
    >
      <span class="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0"></span>
      <span class="text-sm font-medium truncate hidden md:block">
        ${category.name}
      </span>
    </a>
  `).join('');
}

function renderFeaturedPosts(posts) {
  const featuredList = document.getElementById('featured-list');
  if (!featuredList) return;

  if (posts.length === 0) {
    document.getElementById('featured-section')?.classList.add('hidden');
    return;
  }

  featuredList.innerHTML = posts.map(post => `
    <a
      href="/posts/${post.id}"
      class="block group hover:bg-gray-50 rounded-lg p-2 transition-colors hidden md:block"
    >
      ${post.cover_image ? `
        <div class="aspect-video w-full mb-2 rounded overflow-hidden bg-gray-200">
          <img
            src="${post.cover_image}"
            alt="${post.title}"
            class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      ` : ''}
      <h4 class="text-sm font-medium text-gray-900 line-clamp-2 mb-1 group-hover:text-blue-600 transition-colors">
        ${post.title}
      </h4>
      <div class="flex items-center justify-between text-xs">
        <span class="text-gray-600">
          ${post.author?.display_name || '匿名'}
        </span>
        <span class="font-semibold text-orange-600">
          ¥${post.price}
        </span>
      </div>
    </a>
  `).join('');
}

function updateAuthUI(authState) {
  const userShortcuts = document.getElementById('user-shortcuts');
  const loginPrompt = document.getElementById('login-prompt');

  if (authState.isLoggedIn) {
    loginPrompt?.classList.add('hidden');
    
    if (authState.isAuthorized) {
      userShortcuts?.classList.remove('hidden');
    }
  } else {
    userShortcuts?.classList.add('hidden');
    loginPrompt?.classList.remove('hidden');
  }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

export async function initRightSidebar() {
  try {
    // Load all data in parallel
    const [categories, featuredPosts, authState] = await Promise.all([
      loadCategories(),
      loadFeaturedPosts(),
      checkUserAuth()
    ]);

    // Render components
    renderCategories(categories);
    renderFeaturedPosts(featuredPosts);
    updateAuthUI(authState);

    // Listen for auth changes
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        const newAuthState = await checkUserAuth();
        updateAuthUI(newAuthState);
      }
    });

  } catch (error) {
    console.error('Failed to initialize right sidebar:', error);
  }
}

// Auto-initialize when DOM is ready
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initRightSidebar);
  } else {
    initRightSidebar();
  }
}

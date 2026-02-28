/**
 * publish.js - 发布页交互逻辑
 * 包含 Supabase 数据插入逻辑
 * 从 /api/public-config 加载配置，不再硬编码
 */

// ========================================================================
// CONFIGURATION (loaded from /api/public-config)
// ========================================================================
let supabase = null;

async function loadConfig() {
  // Fallback: window.JJCONNECT_CONFIG (inject via script tag in HTML for static deploy)
  const fallback = typeof window !== 'undefined' && window.JJCONNECT_CONFIG;
  try {
    const res = await fetch('/api/public-config');
    const cfg = await res.json();
    if (cfg.supabaseUrl && cfg.supabaseAnonKey) {
      supabase = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
      return supabase;
    }
  } catch (e) {
    console.warn('API config fetch failed, using fallback if available:', e.message);
  }
  if (fallback?.supabaseUrl && fallback?.supabaseAnonKey) {
    supabase = window.supabase.createClient(fallback.supabaseUrl, fallback.supabaseAnonKey);
    return supabase;
  }
  throw new Error('Missing Supabase config. Set NEXT_PUBLIC_* in .env or inject window.JJCONNECT_CONFIG.');
}

// ========================================================================
// STATE
// ========================================================================
let coverFile = null;
let currentCategoryType = 'official';
let categories = [];
let userCategories = [];
let isAuthorized = false;
let currentUser = null;

// ========================================================================
// INITIALIZATION
// ========================================================================
async function init() {
  try {
    await loadConfig();
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      alert('请先登录');
      window.location.href = 'login.html';
      return;
    }

    currentUser = user;

    // 加载分类：从 categories 表获取数据，渲染到 category-select
    const { data: categoriesData } = await supabase
      .from('categories')
      .select('id, name')
      .order('name');

    categories = categoriesData || [];

    // Check authorization
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_authorized')
      .eq('id', user.id)
      .single();

    isAuthorized = profile?.is_authorized || false;

    // Show personal category button if authorized
    if (isAuthorized) {
      const personalBtn = document.getElementById('personal-category-btn');
      if (personalBtn) personalBtn.classList.remove('hidden');

      // Load user categories
      const { data: userCategoriesData } = await supabase
        .from('user_categories')
        .select('*')
        .eq('user_id', user.id)
        .order('name');

      userCategories = userCategoriesData || [];
    }

    // Populate category select
    updateCategorySelect();

  } catch (error) {
    console.error('Initialization error:', error);
    alert('初始化失败: ' + error.message);
  }
}

// ========================================================================
// CATEGORY MANAGEMENT
// ========================================================================
function setCategoryType(type) {
  currentCategoryType = type;

  const officialBtn = document.getElementById('official-category-btn');
  const personalBtn = document.getElementById('personal-category-btn');

  if (type === 'official') {
    officialBtn.className = 'flex-1 py-2 px-4 rounded-lg font-medium transition-colors jjc-btn-primary';
    personalBtn.className = 'flex-1 py-2 px-4 rounded-lg font-medium transition-colors bg-gray-100 text-gray-700 hover:bg-gray-200';
  } else {
    officialBtn.className = 'flex-1 py-2 px-4 rounded-lg font-medium transition-colors bg-gray-100 text-gray-700 hover:bg-gray-200';
    personalBtn.className = 'flex-1 py-2 px-4 rounded-lg font-medium transition-colors jjc-btn-primary';
  }

  updateCategorySelect();
}

function updateCategorySelect() {
  const select = document.getElementById('category-select');
  const items = currentCategoryType === 'official' ? categories : userCategories;
  select.innerHTML = '<option value="">请选择分类...</option>';
  items.forEach(item => {
    const option = document.createElement('option');
    option.value = item.id;
    option.textContent = item.name;
    select.appendChild(option);
  });
}

// ========================================================================
// COVER IMAGE HANDLING
// ========================================================================
function handleCoverChange(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (file.size > 5 * 1024 * 1024) {
    alert('文件大小不能超过 5MB');
    return;
  }

  coverFile = file;

  const reader = new FileReader();
  reader.onload = function (e) {
    document.getElementById('cover-preview').src = e.target.result;
    document.getElementById('cover-preview-container').classList.remove('hidden');
    document.getElementById('cover-upload-area').classList.add('hidden');
  };
  reader.readAsDataURL(file);
}

function removeCover() {
  coverFile = null;
  const input = document.getElementById('cover-input');
  if (input) input.value = '';
  document.getElementById('cover-preview-container').classList.add('hidden');
  document.getElementById('cover-upload-area').classList.remove('hidden');
}

// ========================================================================
// PAID SETTINGS
// ========================================================================
function togglePaidSettings() {
  const isChecked = document.getElementById('is-paid-toggle').checked;
  const container = document.getElementById('price-input-container');

  if (isChecked) {
    container.classList.remove('hidden');
  } else {
    container.classList.add('hidden');
  }
}

// ========================================================================
// FORM SUBMISSION - Supabase 精准写入
// ========================================================================
async function handleSubmit(status) {
  const saveDraftBtn = document.getElementById('save-draft-btn');
  const publishBtn = document.getElementById('publish-btn');

  try {
    saveDraftBtn.disabled = true;
    publishBtn.disabled = true;
    if (status === 'draft') {
      saveDraftBtn.textContent = '保存中...';
    } else {
      publishBtn.textContent = '发布中...';
    }

    const title = document.getElementById('title').value.trim();
    const summary = document.getElementById('summary').value.trim();
    const categoryId = document.getElementById('category-select').value.trim();
    const isPaid = document.getElementById('is-paid-toggle').checked;
    const price = isPaid ? parseFloat(document.getElementById('price-input').value) || 0 : 0;
    const contentText = (document.getElementById('content')?.value || '').trim();

    if (!title) throw new Error('请输入标题');
    if (!contentText) throw new Error('请输入文章内容');

    // 正文以单段落块形式存储，便于与原有 blocks 结构兼容
    const contentData = { blocks: [{ type: 'paragraph', data: { text: contentText } }] };
    const contentJsonString = JSON.stringify(contentData);

    // 3. 封面上传（covers bucket）
    let coverUrl = null;
    if (coverFile) {
      const timestamp = Date.now();
      const fileExt = coverFile.name.split('.').pop();
      const fileName = `${currentUser.id}/${timestamp}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('covers')
        .upload(fileName, coverFile, { contentType: coverFile.type, upsert: false });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('covers').getPublicUrl(uploadData.path);
      coverUrl = publicUrl;
    }

    // 4. 精准写入 Supabase posts 表
    const postData = {
      title,
      content: contentJsonString,
      summary: summary || null,
      cover_image: coverUrl,
      author_id: currentUser.id,
      category_id: currentCategoryType === 'official' && categoryId ? categoryId : null,
      user_category_id: currentCategoryType === 'personal' && categoryId ? categoryId : null,
      is_paid: Boolean(isPaid),
      price,
      status
    };

    const { error: insertError } = await supabase
      .from('posts')
      .insert(postData)
      .select()
      .single();

    if (insertError) throw insertError;

    alert(status === 'published' ? '发布成功！' : '草稿已保存！');
    window.location.href = 'home.html';

  } catch (error) {
    console.error('Submit error:', error);
    alert('操作失败: ' + error.message);

    saveDraftBtn.disabled = false;
    publishBtn.disabled = false;
    saveDraftBtn.textContent = '保存草稿';
    publishBtn.textContent = '立即发布';
  }
}

// ========================================================================
// EVENT BINDING
// ========================================================================
function bindEvents() {
  const coverInput = document.getElementById('cover-input');
  if (coverInput) coverInput.addEventListener('change', handleCoverChange);

  const removeCoverBtn = document.querySelector('[data-action="remove-cover"]');
  if (removeCoverBtn) removeCoverBtn.addEventListener('click', removeCover);

  const officialCategoryBtn = document.getElementById('official-category-btn');
  if (officialCategoryBtn) officialCategoryBtn.addEventListener('click', () => setCategoryType('official'));

  const personalCategoryBtn = document.getElementById('personal-category-btn');
  if (personalCategoryBtn) personalCategoryBtn.addEventListener('click', () => setCategoryType('personal'));

  const isPaidToggle = document.getElementById('is-paid-toggle');
  if (isPaidToggle) isPaidToggle.addEventListener('change', togglePaidSettings);

  const saveDraftBtn = document.getElementById('save-draft-btn');
  if (saveDraftBtn) saveDraftBtn.addEventListener('click', () => handleSubmit('draft'));

  const publishBtn = document.getElementById('publish-btn');
  if (publishBtn) publishBtn.addEventListener('click', () => handleSubmit('published'));
}

// ========================================================================
// RUN ON PAGE LOAD
// ========================================================================
function boot() {
  bindEvents();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}

boot();

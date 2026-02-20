/**
 * publish.js - 发布页交互逻辑
 * 包含 Editor.js 保存逻辑和 Supabase 数据插入逻辑
 */

// ========================================================================
// CONFIGURATION
// ========================================================================
const SUPABASE_URL = 'https://iagbrhyqatsccwdlxoww.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_WYITJIrPsX6ILRbgfKo6_Q_q_h9ZohC';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ========================================================================
// STATE
// ========================================================================
let coverFile = null;
let currentCategoryType = 'official';
let categories = [];
let userCategories = [];
let isAuthorized = false;
let currentUser = null;
let editor = null;

// ========================================================================
// EDITOR.JS 初始化 - 含 Image 工具（Supabase Storage 上传）
// ========================================================================
function createImageUploader() {
  const BUCKET = 'covers'; // 使用已配置的 covers bucket，正文图片存于 content/ 子目录
  return {
    async uploadByFile(file) {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) return { success: 0, file: { url: '' } };
      const timestamp = Date.now();
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${user.id}/content/${timestamp}.${ext}`;
      const { data: uploadData, error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
      if (error) {
        console.error('Image upload error:', error);
        return { success: 0, file: { url: '' } };
      }
      const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(uploadData.path);
      return { success: 1, file: { url: publicUrl } };
    },
    async uploadByUrl(url) {
      const res = await fetch(url, { mode: 'cors' }).catch(() => null);
      if (!res || !res.ok) return { success: 0, file: { url: '' } };
      const blob = await res.blob();
      const file = new File([blob], 'image.jpg', { type: blob.type });
      return this.uploadByFile(file);
    }
  };
}

function initEditor() {
  const imageUploader = createImageUploader();
  editor = new EditorJS({
    holder: 'editor',
    placeholder: '开始写作...',
    tools: {
      header: { class: window.Header, inlineToolbar: true },
      list: { class: window.List, inlineToolbar: true },
      quote: { class: window.Quote, inlineToolbar: true },
      code: window.Code,
      image: {
        class: window.ImageTool,
        config: {
          uploader: imageUploader
        }
      }
    }
  });
  window.editor = editor;
}

// ========================================================================
// INITIALIZATION
// ========================================================================
async function init() {
  try {
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
// FORM SUBMISSION - Editor.js 保存 + Supabase 精准写入
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

    if (!title) throw new Error('请输入标题');

    // 1. 定位编辑器实例，调用 save() 获取 JSON 结构
    const editorInstance = window.editor;
    if (!editorInstance) throw new Error('编辑器尚未加载完成，请稍候再试');
    await editorInstance.isReady;
    const data = await window.editor.save();

    const blocks = data?.blocks || [];
    const hasContent = blocks.some(block => {
      const d = block.data || {};
      if (d.text !== undefined) return !!String(d.text).trim();
      if (Array.isArray(d.items)) return d.items.some(i => !!String(i).trim());
      if (d.file?.url) return true;
      return false;
    });
    if (!hasContent) throw new Error('请输入文章内容');

    // 2. JSON.stringify 转为字符串
    const contentJsonString = JSON.stringify(data);

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
  initEditor();
  bindEvents();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}

boot();

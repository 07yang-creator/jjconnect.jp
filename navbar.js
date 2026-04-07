/**
 * JJConnect 通用导航栏组件
 * 动态生成导航栏，支持登录状态检测和产品下拉菜单
 */

(function() {
    'use strict';
    
    const API_ENDPOINT = (typeof window !== 'undefined' && (window.location.protocol === 'file:' || (window.location.hostname === 'localhost' && window.location.port && window.location.port !== '8787'))) ? 'http://localhost:8787' : 'https://jjconnect-auth-worker.07-yang.workers.dev';
    const supabaseCfg = window.JJCONNECT_CONFIG || {};
    let runtimeAuthProvider = (supabaseCfg.authProvider || 'supabase').toLowerCase();

    function isAuth0() {
        return runtimeAuthProvider === 'auth0';
    }

    function createSafeStorage() {
        const memory = {};
        const canUseLocalStorage = (() => {
            try {
                if (typeof localStorage === 'undefined') return false;
                const testKey = '__jjc_storage_test__';
                localStorage.setItem(testKey, '1');
                localStorage.removeItem(testKey);
                return true;
            } catch (_) {
                return false;
            }
        })();

        return {
            getItem(key) {
                if (canUseLocalStorage) {
                    try {
                        const value = localStorage.getItem(key);
                        if (value !== null) return value;
                    } catch (_) {
                        // fallback to memory storage
                    }
                }
                return Object.prototype.hasOwnProperty.call(memory, key) ? memory[key] : null;
            },
            setItem(key, value) {
                memory[key] = String(value);
                if (!canUseLocalStorage) return;
                try {
                    localStorage.setItem(key, String(value));
                } catch (_) {
                    // Ignore quota/storage errors and keep in memory.
                }
            },
            removeItem(key) {
                delete memory[key];
                if (!canUseLocalStorage) return;
                try {
                    localStorage.removeItem(key);
                } catch (_) {
                    // Ignore storage errors.
                }
            }
        };
    }

    let supabase = null;
    /** Avoid multiple GoTrueClient instances for the same project (same browser storage key). */
    let supabaseCacheKey = '';

    function recreateSupabaseClient() {
        const cfg = window.JJCONNECT_CONFIG || {};
        const url = cfg.supabaseUrl;
        const key = cfg.supabaseAnonKey;
        if (!window.supabase || !url || !key) {
            supabase = null;
            supabaseCacheKey = '';
            return;
        }
        const nextKey = String(url) + '\0' + String(key);
        if (supabase && supabaseCacheKey === nextKey) {
            return;
        }
        supabaseCacheKey = nextKey;
        supabase = window.supabase.createClient(url, key, {
            auth: {
                storage: createSafeStorage(),
                detectSessionInUrl: true
            }
        });
    }

    recreateSupabaseClient();

    /** Shared browser Supabase client for static pages (e.g. login.html). */
    window.__jjc_getSupabaseBrowserClient = function() {
        recreateSupabaseClient();
        return supabase;
    };

    /** Align with Next `/api/public-config` (JJC_AUTH_PROVIDER precedence) so Sign in uses Auth0 without editing jjc-default-config.js. */
    async function mergeRemotePublicConfig() {
        const origin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : '';
        if (!origin || origin === 'null') return;
        if (typeof window !== 'undefined' && window.__JJC_SKIP_REMOTE_PUBLIC_CONFIG__ === true) return;
        if (typeof document !== 'undefined' && document.documentElement && document.documentElement.hasAttribute('data-jjc-skip-public-config')) return;
        try {
            const res = await fetch(origin + '/api/public-config', { credentials: 'include' });
            if (!res.ok) return;
            const text = await res.text();
            if (!text || !String(text).trim()) return;
            let j;
            try {
                j = JSON.parse(text);
            } catch (_) {
                return;
            }
            if (!j || typeof j !== 'object') return;
            window.JJCONNECT_CONFIG = Object.assign({}, window.JJCONNECT_CONFIG || {}, {
                authProvider: j.authProvider || (window.JJCONNECT_CONFIG && window.JJCONNECT_CONFIG.authProvider),
                supabaseUrl: j.supabaseUrl || (window.JJCONNECT_CONFIG && window.JJCONNECT_CONFIG.supabaseUrl),
                supabaseAnonKey: j.supabaseAnonKey || (window.JJCONNECT_CONFIG && window.JJCONNECT_CONFIG.supabaseAnonKey),
            });
            runtimeAuthProvider = ((window.JJCONNECT_CONFIG || {}).authProvider || 'supabase').toLowerCase();
            recreateSupabaseClient();
        } catch (_) {
            /* keep JJCONNECT_CONFIG defaults */
        }
    }
    
    /** Root-relative so logo/home work on nested App Router paths (e.g. /article/…). */
    /** Bundled mark: `public/brand/jjconnect-logo.png` (no WordPress path). Fallback: JJ monogram SVG. */
    const LOGO_IMG_PRIMARY = '/brand/jjconnect-logo.png';
    const LOGO_IMG_FALLBACK = '/brand/jjconnect-navbar-logo.svg';

    const USER_PLACEHOLDER_SVG = '<svg class="jjc-user-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>';

    function signInHrefForCurrentPage() {
        const returnPath = typeof window !== 'undefined'
            ? (window.location.pathname || '') + (window.location.search || '')
            : '/';
        return isAuth0()
            ? `/auth/login?returnTo=${encodeURIComponent(returnPath)}`
            : `/login?next=${encodeURIComponent(returnPath)}`;
    }

    /**
     * 生成导航栏 HTML
     */
    function createNavbarHTML(isLoggedIn, userData) {
        const signInHref = signInHrefForCurrentPage();
        const currentRole = userData?.role || 'T';
        const isAdmin = currentRole === 'A';
        const canUseAiTool = isLoggedIn && currentRole !== 'T';
        let monoPageLinkDesktop = '';
        let monoPageLinkMobile = '';
        if (currentRole === 'B') {
            monoPageLinkDesktop = '<a href="mono_bb.html" class="jjc-user-dropdown-item">Mono Page BB</a>';
            monoPageLinkMobile = '<a href="mono_bb.html" class="jjc-mobile-link">Mono Page BB</a>';
        } else if (currentRole === 'CB') {
            monoPageLinkDesktop = '<a href="mono_cb.html" class="jjc-user-dropdown-item">Mono Page CB</a>';
            monoPageLinkMobile = '<a href="mono_cb.html" class="jjc-mobile-link">Mono Page CB</a>';
        } else if (currentRole === 'VB') {
            monoPageLinkDesktop = '<a href="mono_vb.html" class="jjc-user-dropdown-item">Mono Page VB</a>';
            monoPageLinkMobile = '<a href="mono_vb.html" class="jjc-mobile-link">Mono Page VB</a>';
        }
        const avatarUrl = userData?.avatar_url || (typeof localStorage !== 'undefined' ? localStorage.getItem('jjc_avatar_url') : null);
        const avatarSrc = avatarUrl ? (avatarUrl.startsWith('http') ? avatarUrl : (API_ENDPOINT || (typeof window !== 'undefined' && window.location.origin) || '') + avatarUrl) : '';
        return `
        <nav class="jjc-navbar">
            <div class="jjc-navbar-container">
                <!-- Logo -->
                <a href="/" class="jjc-navbar-logo" aria-label="JJCONNECT home">
                    <img src="${LOGO_IMG_PRIMARY}" alt="" height="40" decoding="async" onerror="this.onerror=null;this.src='${LOGO_IMG_FALLBACK}'">
                    <span>JJCONNECT</span>
                </a>
                
                <!-- 导航链接（桌面端） -->
                <div class="jjc-navbar-nav">
                    <a href="/gettingready.html" class="jjc-nav-link">Home</a>
                    <!-- Services dropdown -->
                    <div class="jjc-nav-dropdown" id="jjc-services-dropdown">
                        <a href="services.html" class="jjc-nav-link jjc-nav-dropdown-toggle">Services</a>
                        <div class="jjc-nav-dropdown-menu">
                            <a href="/raft_info.html" class="jjc-nav-dropdown-item">
                                <span class="jjc-nav-dropdown-icon">🚢</span>
                                <span>RAFT2.03</span>
                            </a>
                            <a href="/mansion_info.html" class="jjc-nav-dropdown-item">
                                <span class="jjc-nav-dropdown-icon">🏢</span>
                                <span>Mansion Manager</span>
                            </a>
                            <a href="/property_report_info.html" class="jjc-nav-dropdown-item">
                                <span class="jjc-nav-dropdown-icon">📊</span>
                                <span>Property Report</span>
                            </a>
                        </div>
                    </div>
                    <!-- Arena dropdown -->
                    <div class="jjc-nav-dropdown" id="jjc-arena-dropdown">
                        <a href="#" class="jjc-nav-link jjc-nav-dropdown-toggle">Arena</a>
                        <div class="jjc-nav-dropdown-menu">
                            <a href="admin-console.html" class="jjc-nav-dropdown-item">
                                <span class="jjc-nav-dropdown-icon">🛠️</span>
                                <span>Admin Console</span>
                            </a>
                            <a href="/publish" class="jjc-nav-dropdown-item">
                                <span class="jjc-nav-dropdown-icon">✍️</span>
                                <span>Writing Articles</span>
                            </a>
                            <a href="home.html" class="jjc-nav-dropdown-item">
                                <span class="jjc-nav-dropdown-icon">📄</span>
                                <span>Articles</span>
                            </a>
                        </div>
                    </div>
                    ${canUseAiTool ? '<a href="ai.html" class="jjc-nav-link">✨AI empowered</a>' : ''}
                    <a href="about.html" class="jjc-nav-link">About Us</a>
                </div>
                
                <!-- 用户区域：已登录为头像+菜单；未登录为占位图标，点击去登录 -->
                <div class="jjc-navbar-user">
                    ${isLoggedIn ? `
                        <div class="jjc-user-menu">
                            <button type="button" class="jjc-user-button" id="jjc-user-menu-btn" aria-label="Account menu" aria-haspopup="true">
                                ${avatarSrc ? '<img class="jjc-user-avatar" src="' + avatarSrc + '" alt="" referrerpolicy="no-referrer">' : USER_PLACEHOLDER_SVG}
                            </button>
                            <div class="jjc-user-dropdown" id="jjc-user-dropdown">
                                <a href="profile.html?view=own" class="jjc-user-dropdown-item">My Profile</a>
                                ${isAdmin ? '<a href="admin-console.html" class="jjc-user-dropdown-item">Admin Console</a>' : ''}
                                ${monoPageLinkDesktop}
                                <button id="jjc-logout-btn" class="jjc-user-dropdown-item">Logout</button>
                            </div>
                        </div>
                    ` : `
                        <a href="${signInHref}" class="jjc-user-button jjc-user-button--guest" id="jjc-user-signin-link" aria-label="Sign in">
                            ${USER_PLACEHOLDER_SVG}
                        </a>
                    `}
                </div>
                
                <!-- 移动端菜单按钮 -->
                <button class="jjc-mobile-toggle" id="jjc-mobile-toggle">
                    <span></span>
                    <span></span>
                    <span></span>
                </button>
            </div>
            
            <!-- 移动端菜单 -->
            <div class="jjc-mobile-menu" id="jjc-mobile-menu">
                <a href="/gettingready.html" class="jjc-mobile-link">Home</a>
                
                <div class="jjc-mobile-divider"></div>
                <a href="services.html" class="jjc-mobile-link" style="font-weight: 600;">Services</a>
                <div class="jjc-mobile-services">
                    <a href="/raft_info.html" class="jjc-mobile-service-link">
                        <span>🚢</span>
                        <span>RAFT2.03</span>
                    </a>
                    <a href="/mansion_info.html" class="jjc-mobile-service-link">
                        <span>🏢</span>
                        <span>Mansion Manager</span>
                    </a>
                    <a href="/property_report_info.html" class="jjc-mobile-service-link">
                        <span>📊</span>
                        <span>Property Report</span>
                    </a>
                </div>
                
                <div class="jjc-mobile-divider"></div>
                <a href="#" class="jjc-mobile-link" style="font-weight: 600;" onclick="event.preventDefault();">Arena</a>
                <div class="jjc-mobile-services">
                    <a href="admin-console.html" class="jjc-mobile-service-link">
                        <span>🛠️</span>
                        <span>Admin Console</span>
                    </a>
                    <a href="/publish" class="jjc-mobile-service-link">
                        <span>✍️</span>
                        <span>Writing Articles</span>
                    </a>
                    <a href="home.html" class="jjc-mobile-service-link">
                        <span>📄</span>
                        <span>Articles</span>
                    </a>
                </div>
                ${canUseAiTool ? '<a href="ai.html" class="jjc-mobile-link">✨AI empowered</a>' : ''}
                <a href="about.html" class="jjc-mobile-link">About Us</a>
                
                <div class="jjc-mobile-divider"></div>
                ${isLoggedIn ? `
                    <a href="profile.html?view=own" class="jjc-mobile-link">My Profile</a>
                    <div class="jjc-mobile-user" aria-hidden="true">${avatarSrc ? '<img class="jjc-mobile-avatar" src="' + avatarSrc + '" alt="" referrerpolicy="no-referrer">' : '<span class="jjc-mobile-user-fallback">👤</span>'}</div>
                    ${isAdmin ? '<a href="admin-console.html" class="jjc-mobile-link">Admin Console</a>' : ''}
                    ${monoPageLinkMobile}
                    <button id="jjc-mobile-logout" class="jjc-mobile-link">Logout</button>
                ` : `
                    <a href="${signInHref}" class="jjc-mobile-link">Sign in</a>
                `}
            </div>
        </nav>
        `;
    }
    
    /**
     * 检查登录状态
     */
    async function checkAuthStatus() {
        if (isAuth0()) {
            try {
                const res = await fetch('/api/me', { credentials: 'include' });
                if (!res.ok) return { isLoggedIn: false, userData: null };
                const payload = await res.json();
                if (!payload?.isLoggedIn || !payload?.userData) {
                    return { isLoggedIn: false, userData: null };
                }
                return { isLoggedIn: true, userData: payload.userData };
            } catch (error) {
                console.error('Auth0 auth check failed:', error);
                return { isLoggedIn: false, userData: null };
            }
        }

        if (!supabase) {
            return { isLoggedIn: false, userData: null };
        }

        try {
            const { data: sessionData } = await supabase.auth.getSession();
            const session = sessionData?.session;
            if (!session) {
                return { isLoggedIn: false, userData: null };
            }

            const user = session.user;
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('role, avatar_url, display_name')
                .eq('id', user.id)
                .single();
            if (profileError) {
                console.warn('Failed to load profile role, fallback to T:', profileError);
            }
            const meta = user?.user_metadata || {};
            const avatarFromMeta =
                meta.avatar_url || meta.picture || meta.profile_image_url || meta.photo_url || null;
            return {
                isLoggedIn: true,
                userData: {
                    username:
                        profileData?.display_name ||
                        meta.username ||
                        meta.name ||
                        user?.email ||
                        'User',
                    email: user?.email || '',
                    avatar_url: profileData?.avatar_url || avatarFromMeta || null,
                    role: profileData?.role || 'T'
                }
            };
        } catch (error) {
            console.error('Auth check failed:', error);
            return { isLoggedIn: false, userData: null };
        }
    }
    
    /** Clear Next/Supabase SSR auth cookies (no-op if not on app origin). */
    async function clearServerSupabaseSession() {
        const origin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : '';
        if (!origin || origin === 'null') return;
        try {
            await fetch(origin + '/api/auth/sign-out', { method: 'POST', credentials: 'include' });
        } catch (_) {
            /* static hosting / offline */
        }
    }

    /**
     * 退出登录
     */
    async function handleLogout() {
        const clearLocalChrome = () => {
            localStorage.removeItem('user_info');
            localStorage.removeItem('jjc_avatar_url');
            document.cookie = 'jjc_sb_access_token=; Path=/; Max-Age=0; SameSite=Lax';
        };

        if (isAuth0()) {
            clearLocalChrome();
            await clearServerSupabaseSession();
            window.location.href = `/auth/logout?returnTo=${encodeURIComponent(window.location.origin)}`;
            return;
        }

        const finalize = () => {
            clearLocalChrome();
            window.location.reload();
        };

        try {
            if (supabase) await supabase.auth.signOut();
        } catch (error) {
            console.error('Logout failed:', error);
        }
        await clearServerSupabaseSession();
        finalize();
    }
    
    /**
     * 生成 Footer HTML
     */
    function createFooterHTML() {
        return `
        <footer class="jjc-footer">
            <div class="jjc-footer-container">
                <!-- Logo & Copyright -->
                <div class="jjc-footer-logo">
                    <img src="${LOGO_IMG_PRIMARY}" alt="" height="40" decoding="async" onerror="this.onerror=null;this.src='${LOGO_IMG_FALLBACK}'">
                    <span class="jjc-footer-copy">©JJCONNECT 2025</span>
                    <a href="/support" class="jjc-footer-support-link" style="display:block;margin-top:8px;font-size:0.8125rem;color:inherit;text-decoration:underline;text-underline-offset:2px;opacity:0.88;">Help &amp; support</a>
                </div>
                
                <!-- Social Media Links -->
                <div class="jjc-footer-social">
                    <a href="https://twitter.com/jjconnect" target="_blank" rel="noopener noreferrer" class="jjc-social-link" aria-label="X (Twitter)">
                        <svg fill="currentColor" version="1.1" xmlns="http://www.w3.org/2000/svg" width="23" height="24" viewBox="0 0 23 24">
                            <path d="M13.969 10.157l8.738-10.157h-2.071l-7.587 8.819-6.060-8.819h-6.989l9.164 13.336-9.164 10.651h2.071l8.012-9.313 6.4 9.313h6.989l-9.503-13.831zM11.133 13.454l-8.316-11.895h3.181l14.64 20.941h-3.181l-6.324-9.046z"></path>
                        </svg>
                    </a>
                    <a href="https://instagram.com/jjconnect" target="_blank" rel="noopener noreferrer" class="jjc-social-link" aria-label="Instagram">
                        <svg fill="currentColor" version="1.1" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                            <path d="M7 1c-1.657 0-3.158 0.673-4.243 1.757s-1.757 2.586-1.757 4.243v10c0 1.657 0.673 3.158 1.757 4.243s2.586 1.757 4.243 1.757h10c1.657 0 3.158-0.673 4.243-1.757s1.757-2.586 1.757-4.243v-10c0-1.657-0.673-3.158-1.757-4.243s-2.586-1.757-4.243-1.757zM7 3h10c1.105 0 2.103 0.447 2.828 1.172s1.172 1.723 1.172 2.828v10c0 1.105-0.447 2.103-1.172 2.828s-1.723 1.172-2.828 1.172h-10c-1.105 0-2.103-0.447-2.828-1.172s-1.172-1.723-1.172-2.828v-10c0-1.105 0.447-2.103 1.172-2.828s1.723-1.172 2.828-1.172zM16.989 11.223c-0.15-0.972-0.571-1.857-1.194-2.567-0.754-0.861-1.804-1.465-3.009-1.644-0.464-0.074-0.97-0.077-1.477-0.002-1.366 0.202-2.521 0.941-3.282 1.967s-1.133 2.347-0.93 3.712 0.941 2.521 1.967 3.282 2.347 1.133 3.712 0.93 2.521-0.941 3.282-1.967 1.133-2.347 0.93-3.712zM15.011 11.517c0.122 0.82-0.1 1.609-0.558 2.227s-1.15 1.059-1.969 1.18-1.609-0.1-2.227-0.558-1.059-1.15-1.18-1.969 0.1-1.609 0.558-2.227 1.15-1.059 1.969-1.18c0.313-0.046 0.615-0.042 0.87-0.002 0.74 0.11 1.366 0.47 1.818 0.986 0.375 0.428 0.63 0.963 0.72 1.543zM17.5 7.5c0.552 0 1-0.448 1-1s-0.448-1-1-1-1 0.448-1 1 0.448 1 1 1z"></path>
                        </svg>
                    </a>
                    <a href="https://facebook.com/jjconnect" target="_blank" rel="noopener noreferrer" class="jjc-social-link" aria-label="Facebook">
                        <svg fill="currentColor" version="1.1" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
                            <path d="M31.997 15.999c0-8.836-7.163-15.999-15.999-15.999s-15.999 7.163-15.999 15.999c0 7.985 5.851 14.604 13.499 15.804v-11.18h-4.062v-4.625h4.062v-3.525c0-4.010 2.389-6.225 6.043-6.225 1.75 0 3.581 0.313 3.581 0.313v3.937h-2.017c-1.987 0-2.607 1.233-2.607 2.498v3.001h4.437l-0.709 4.625h-3.728v11.18c7.649-1.2 13.499-7.819 13.499-15.804z"></path>
                        </svg>
                    </a>
                </div>
                
                <div style="width: 100px;"></div>
            </div>
        </footer>
        `;
    }
    
    /**
     * 初始化导航栏
     */
    async function initNavbar() {
        await mergeRemotePublicConfig();

        // 检查是否已存在导航栏
        if (document.getElementById('jjconnect-navbar')) {
            return;
        }
        
        // 检查登录状态
        const { isLoggedIn, userData } = await checkAuthStatus();
        
        // 创建导航栏容器
        const navContainer = document.createElement('div');
        navContainer.id = 'jjconnect-navbar';
        navContainer.innerHTML = createNavbarHTML(isLoggedIn, userData);
        
        // 插入到 body 开头
        document.body.insertBefore(navContainer.firstElementChild, document.body.firstChild);
        
        // 绑定事件
        setupEventListeners(isLoggedIn);
    }
    
    /**
     * 初始化 Footer
     */
    function initFooter() {
        // 检查是否已存在 footer
        if (document.getElementById('jjconnect-footer')) {
            return;
        }
        
        // 创建 footer 容器
        const footerContainer = document.createElement('div');
        footerContainer.id = 'jjconnect-footer';
        footerContainer.innerHTML = createFooterHTML();
        
        // 插入到 body 末尾
        document.body.appendChild(footerContainer.firstElementChild);
    }
    
    /**
     * 设置事件监听
     */
    function setupEventListeners(isLoggedIn) {
        // Arena dropdown
        const arenaDropdown = document.getElementById('jjc-arena-dropdown');
        if (arenaDropdown) {
            const toggle = arenaDropdown.querySelector('.jjc-nav-dropdown-toggle');
            toggle.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                arenaDropdown.classList.toggle('active');
            });
            document.addEventListener('click', (e) => {
                if (!arenaDropdown.contains(e.target)) {
                    arenaDropdown.classList.remove('active');
                }
            });
            arenaDropdown.querySelectorAll('.jjc-nav-dropdown-item').forEach((item) => {
                item.addEventListener('click', () => {
                    arenaDropdown.classList.remove('active');
                });
            });
        }

        // Services dropdown
        const servicesDropdown = document.getElementById('jjc-services-dropdown');
        if (servicesDropdown) {
            const toggle = servicesDropdown.querySelector('.jjc-nav-dropdown-toggle');

            toggle.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                servicesDropdown.classList.toggle('active');
            });
            
            document.addEventListener('click', (e) => {
                if (!servicesDropdown.contains(e.target)) {
                    servicesDropdown.classList.remove('active');
                }
            });

            servicesDropdown.querySelectorAll('.jjc-nav-dropdown-item').forEach((item) => {
                item.addEventListener('click', () => {
                    servicesDropdown.classList.remove('active');
                });
            });
        }
        
        // 用户菜单下拉
        const userMenuBtn = document.getElementById('jjc-user-menu-btn');
        const userDropdown = document.getElementById('jjc-user-dropdown');
        
        if (userMenuBtn && userDropdown) {
            userMenuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                userDropdown.classList.toggle('active');
            });
            
            // 点击外部关闭
            document.addEventListener('click', () => {
                userDropdown.classList.remove('active');
            });
        }
        
        // 退出登录按钮
        const logoutBtn = document.getElementById('jjc-logout-btn');
        const mobileLogoutBtn = document.getElementById('jjc-mobile-logout');
        
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                void handleLogout();
            });
        }
        
        if (mobileLogoutBtn) {
            mobileLogoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                void handleLogout();
            });
        }
        
        // 移动菜单切换
        const mobileToggle = document.getElementById('jjc-mobile-toggle');
        const mobileMenu = document.getElementById('jjc-mobile-menu');
        
        if (mobileToggle && mobileMenu) {
            mobileToggle.addEventListener('click', () => {
                mobileMenu.classList.toggle('active');
            });
        }
    }
    
    /**
     * 页面加载完成后初始化
     */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            void initNavbar();
            initFooter();
        });
    } else {
        void initNavbar();
        initFooter();
    }
    
    // 暴露到全局，以便其他脚本调用
    window.JJCNavbar = {
        refresh: initNavbar,
        refreshFooter: initFooter,
        logout: handleLogout,
        checkAuth: checkAuthStatus
    };
})();

/**
 * JJConnect 通用导航栏组件
 * 动态生成导航栏，支持登录状态检测和产品下拉菜单
 */

(function() {
    'use strict';
    
    const API_ENDPOINT = 'http://localhost:8787';
    
    /**
     * 生成导航栏 HTML
     */
    function createNavbarHTML(isLoggedIn, userData) {
        return `
        <nav class="jjc-navbar">
            <div class="jjc-navbar-container">
                <!-- Logo -->
                <a href="index.html" class="jjc-navbar-logo">
                    <img src="wp-content/uploads/2025/08/cropped-cropped-logo-icon-1.png" alt="JJCONNECT">
                    <span>JJCONNECT</span>
                </a>
                
                <!-- 导航链接（桌面端） -->
                <div class="jjc-navbar-nav">
                    <a href="about.html" class="jjc-nav-link">关于我们</a>
                    
                    <!-- 产品下拉菜单 -->
                    <div class="jjc-nav-dropdown" id="jjc-products-dropdown">
                        <a href="product.html" class="jjc-nav-link jjc-nav-dropdown-toggle">产品服务</a>
                        <div class="jjc-nav-dropdown-menu">
                            <a href="raft_info.html" class="jjc-nav-dropdown-item">
                                <span class="jjc-nav-dropdown-icon">🚢</span>
                                <span>RAFT2.03</span>
                            </a>
                            <a href="mansion_info.html" class="jjc-nav-dropdown-item">
                                <span class="jjc-nav-dropdown-icon">🏢</span>
                                <span>Mansion管理主任</span>
                            </a>
                            <a href="property_report_info.html" class="jjc-nav-dropdown-item">
                                <span class="jjc-nav-dropdown-icon">📊</span>
                                <span>地产报告</span>
                            </a>
                        </div>
                    </div>
                </div>
                
                <!-- 用户区域（桌面端） -->
                <div class="jjc-navbar-user">
                    ${isLoggedIn ? `
                        <div class="jjc-user-menu">
                            <button class="jjc-user-button" id="jjc-user-menu-btn">
                                <svg class="jjc-user-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="12" cy="7" r="4"></circle>
                                </svg>
                                <span>${userData?.username || '用户'}</span>
                            </button>
                            <div class="jjc-user-dropdown" id="jjc-user-dropdown">
                                ${userData?.role >= 2 ? '<a href="admin.html" class="jjc-user-dropdown-item">管理后台</a>' : ''}
                                <button id="jjc-logout-btn" class="jjc-user-dropdown-item">退出登录</button>
                            </div>
                        </div>
                    ` : `
                        <a href="login.html" class="jjc-btn jjc-btn-outline">登录</a>
                        <a href="login.html?tab=register" class="jjc-btn jjc-btn-primary">注册</a>
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
                <a href="about.html" class="jjc-mobile-link">关于我们</a>
                
                <div class="jjc-mobile-divider"></div>
                <a href="product.html" class="jjc-mobile-link" style="font-weight: 600;">产品服务</a>
                <div class="jjc-mobile-products">
                    <a href="raft_info.html" class="jjc-mobile-product-link">
                        <span>🚢</span>
                        <span>RAFT2.03</span>
                    </a>
                    <a href="mansion_info.html" class="jjc-mobile-product-link">
                        <span>🏢</span>
                        <span>Mansion管理主任</span>
                    </a>
                    <a href="property_report_info.html" class="jjc-mobile-product-link">
                        <span>📊</span>
                        <span>地产报告</span>
                    </a>
                </div>
                
                <div class="jjc-mobile-divider"></div>
                ${isLoggedIn ? `
                    <div class="jjc-mobile-user">👤 ${userData?.username || '用户'}</div>
                    ${userData?.role >= 2 ? '<a href="admin.html" class="jjc-mobile-link">管理后台</a>' : ''}
                    <button id="jjc-mobile-logout" class="jjc-mobile-link">退出登录</button>
                ` : `
                    <a href="login.html" class="jjc-mobile-link">登录</a>
                    <a href="login.html?tab=register" class="jjc-mobile-link">注册</a>
                `}
            </div>
        </nav>
        `;
    }
    
    /**
     * 检查登录状态
     */
    async function checkAuthStatus() {
        const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
        
        if (!token) {
            return { isLoggedIn: false, userData: null };
        }
        
        try {
            const response = await fetch(`${API_ENDPOINT}/api/auth/check`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            const data = await response.json();
            
            if (data.authenticated) {
                return { 
                    isLoggedIn: true, 
                    userData: data.user 
                };
            }
        } catch (error) {
            console.error('Auth check failed:', error);
        }
        
        return { isLoggedIn: false, userData: null };
    }
    
    /**
     * 退出登录
     */
    function handleLogout() {
        localStorage.removeItem('auth_token');
        sessionStorage.removeItem('auth_token');
        localStorage.removeItem('user_info');
        window.location.reload();
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
                    <img src="wp-content/uploads/2025/08/cropped-cropped-logo-icon-1.png" alt="JJCONNECT">
                    <span class="jjc-footer-copy">©JJCONNECT 2025</span>
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
        // 产品下拉菜单
        const productsDropdown = document.getElementById('jjc-products-dropdown');
        if (productsDropdown) {
            const toggle = productsDropdown.querySelector('.jjc-nav-dropdown-toggle');
            
            // 鼠标悬停显示下拉菜单
            productsDropdown.addEventListener('mouseenter', (e) => {
                productsDropdown.classList.add('active');
            });
            
            productsDropdown.addEventListener('mouseleave', (e) => {
                productsDropdown.classList.remove('active');
            });
            
            // 点击链接时允许跳转
            toggle.addEventListener('click', (e) => {
                // 如果下拉菜单已显示，允许链接跳转
                if (productsDropdown.classList.contains('active')) {
                    // 让链接正常工作
                    return true;
                } else {
                    // 首次点击显示下拉菜单
                    e.preventDefault();
                    e.stopPropagation();
                    productsDropdown.classList.add('active');
                }
            });
            
            // 点击外部关闭
            document.addEventListener('click', (e) => {
                if (!productsDropdown.contains(e.target)) {
                    productsDropdown.classList.remove('active');
                }
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
                handleLogout();
            });
        }
        
        if (mobileLogoutBtn) {
            mobileLogoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                handleLogout();
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
            initNavbar();
            initFooter();
        });
    } else {
        initNavbar();
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

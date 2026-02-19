# 页面 ID 489 访问映射说明

## 📌 概述

为了保持外部已发布链接的有效性，`jjconnect.jp/?page_id=489` 这个 URL 地址必须保持可访问。

## 🔗 URL 与文件映射

| WordPress URL | 文件名 | 说明 |
|--------------|--------|------|
| `jjconnect.jp/?page_id=489` | `joint-mamori-submission.html` | Joint Mamori Project Submission 页面 |

## ⚠️ 重要提示

**请勿重命名 `joint-mamori-submission.html` 文件！**

此文件对应 WordPress 的 `?page_id=489` 参数，已经有外部链接指向此地址。任何文件名变更都会导致外部链接失效。

## 🌐 服务器配置

如果您使用的是 WordPress，URL 路由由 WordPress 自动处理：
- WordPress 会将 `?page_id=489` 映射到对应的页面
- HTML 文件 `joint-mamori-submission.html` 是该页面的静态版本

如果您使用的是静态服务器，需要配置 URL 重写规则：

### Apache (.htaccess)
```apache
# 将 ?page_id=489 重定向到 joint-mamori-submission.html
RewriteEngine On
RewriteCond %{QUERY_STRING} ^page_id=489$
RewriteRule ^$ /joint-mamori-submission.html [L]
```

### Nginx
```nginx
# 将 ?page_id=489 重定向到 joint-mamori-submission.html
location / {
    if ($args ~ "^page_id=489$") {
        rewrite ^(.*)$ /joint-mamori-submission.html last;
    }
}
```

## 📄 页面内容

此页面包含：
- Joint Mamori Project（联合守望项目）提交表单
- 使用 Forminator 表单插件
- 包含图片上传、文本输入等功能
- 集成了 JJConnect 导航栏系统（navbar.js）

## 🔄 更新历史

| 日期 | 操作 | 说明 |
|------|------|------|
| 2026-02-07 | 恢复原始文件名 | 从 `index-page-533.html` 改回 `joint-mamori-submission.html` |
| 2026-02-06 | 错误重命名 | 临时重命名为 `index-page-533.html`（已撤销） |

## ✅ 验证清单

- [x] `joint-mamori-submission.html` 文件存在并包含完整内容（96KB）
- [x] 文件包含 `navbar.js` 和 `navbar.css` 引用
- [x] 文档中已移除所有对 `index-page-533.html` 的错误引用
- [x] 外部链接 `jjconnect.jp/?page_id=489` 保持可访问

## 📞 相关页面

- **导航栏系统**: `navbar.js`, `navbar.css`
- **其他核心页面**: 
  - `index.html` - 首页
  - `about.html` - 关于我们
  - `feedback.html` - 反馈页面
  - `login.html` - 登录页面

---

**最后更新**: 2026-02-07  
**维护者**: JJConnect 开发团队

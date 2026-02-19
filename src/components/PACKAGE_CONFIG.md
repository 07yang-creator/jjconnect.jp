# RightSidebar 组件 - Package.json 配置建议

如果你的项目还没有这些脚本，建议添加以下配置到 `package.json`：

## 测试脚本

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:sidebar": "jest src/components/RightSidebar.test.tsx"
  },
  "devDependencies": {
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "@testing-library/user-event": "^14.0.0",
    "jest": "^29.0.0",
    "jest-environment-jsdom": "^29.0.0"
  }
}
```

## TypeScript 配置

确保 `tsconfig.json` 包含以下设置：

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "paths": {
      "@/*": ["./*"],
      "@/src/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/types/*": ["./types/*"]
    }
  },
  "include": ["src", "types"],
  "exclude": ["node_modules"]
}
```

## Tailwind CSS 配置

确保 `tailwind.config.js` 包含 src 目录：

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './app/**/*.{js,ts,jsx,tsx}',
    './pages/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

## Next.js 配置（如果使用）

`next.config.js`:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      'your-supabase-project.supabase.co', // Supabase storage
    ],
  },
}

module.exports = nextConfig
```

## 环境变量

创建 `.env.local` 文件：

```env
# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# 或者用于 Cloudflare Workers
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 完整的 package.json 示例

```json
{
  "name": "jjconnect",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:sidebar": "jest src/components/RightSidebar.test.tsx",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "next": "^14.0.0",
    "@supabase/supabase-js": "^2.39.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "@testing-library/user-event": "^14.0.0",
    "typescript": "^5.0.0",
    "jest": "^29.0.0",
    "jest-environment-jsdom": "^29.0.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "eslint": "^8.0.0",
    "eslint-config-next": "^14.0.0"
  }
}
```

## Jest 配置

创建 `jest.config.js`：

```js
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@/src/(.*)$': '<rootDir>/src/$1',
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/types/(.*)$': '<rootDir>/types/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/__tests__/**',
  ],
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)
```

创建 `jest.setup.js`：

```js
// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})
```

## ESLint 配置

`.eslintrc.json`:

```json
{
  "extends": [
    "next/core-web-vitals",
    "plugin:@typescript-eslint/recommended"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": "warn",
    "@typescript-eslint/no-explicit-any": "warn",
    "react/no-unescaped-entities": "off"
  }
}
```

## 使用这些配置

### 1. 安装依赖

```bash
npm install
```

### 2. 运行测试

```bash
# 运行所有测试
npm test

# 运行 RightSidebar 测试
npm run test:sidebar

# 运行测试并监听变化
npm run test:watch

# 生成测试覆盖率报告
npm run test:coverage
```

### 3. 类型检查

```bash
npm run type-check
```

### 4. 开发模式

```bash
npm run dev
```

### 5. 生产构建

```bash
npm run build
npm start
```

---

## 注意事项

1. **版本兼容性**
   - React 18+ 需要
   - Node.js 18+ 推荐
   - Next.js 14+ 如果使用

2. **路径别名**
   - 确保 `tsconfig.json` 中的 paths 配置正确
   - 确保 `jest.config.js` 中的 moduleNameMapper 匹配

3. **环境变量**
   - 不要将 `.env.local` 提交到 git
   - 在 `.gitignore` 中添加 `.env*.local`

4. **Tailwind CSS**
   - 确保 `tailwind.config.js` 包含所有内容路径
   - 确保 `globals.css` 中导入了 Tailwind 指令

---

## 验证配置

运行以下命令验证配置是否正确：

```bash
# 1. 类型检查
npm run type-check

# 2. 运行测试
npm run test:sidebar

# 3. 启动开发服务器
npm run dev

# 4. 访问演示页面
# 浏览器打开: http://localhost:3000
```

如果所有命令都成功运行，说明配置正确！✅

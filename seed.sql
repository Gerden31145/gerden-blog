INSERT IGNORE INTO tags (name, slug) VALUES
('JavaScript', 'javascript'),
('Vue', 'vue'),
('Nuxt', 'nuxt'),
('CSS', 'css'),
('TypeScript', 'typescript');

INSERT INTO posts (title, slug, summary, content, content_html, post_status, cover_image, published_at, created_at, updated_at) VALUES
('Nuxt 4 入门指南', 'nuxt4-getting-started', '一篇全面的 Nuxt 4 入门教程，带你从零搭建项目。',
'## 前言\n\nNuxt 4 是 Nuxt.js 的最新版本，带来了许多改进和新特性。本文将从零开始，带你一步步搭建一个完整的 Nuxt 项目。\n\n## 安装\n\nnpx nuxi@latest init my-app\n\n## 目录结构\n\nNuxt 4 的目录结构相比 v3 有一些调整...\n\n## 总结\n\nNuxt 4 是一个值得升级的版本。',
'<h2>前言</h2><p>Nuxt 4 是 Nuxt.js 的最新版本，带来了许多改进和新特性。</p><h2>安装</h2><p>npx nuxi@latest init my-app</p>',
'published', 'https://picsum.photos/seed/nuxt4/800/400', '2026-05-10 10:00:00', NOW(), NOW()),

('Vue 3 组合式 API 深入理解', 'vue3-composition-api-deep-dive', '深入探讨 Vue 3 组合式 API 的核心概念和最佳实践。',
'## 组合式 API 简介\n\n组合式 API 是 Vue 3 最重要的新特性之一，它提供了一种更灵活的方式来组织和复用逻辑。\n\n## ref 与 reactive\n\nconst count = ref(0)\nconst state = reactive({ name: "" })\n\n## 总结\n\n组合式 API 让代码组织更加清晰。',
'<h2>组合式 API 简介</h2><p>组合式 API 是 Vue 3 最重要的新特性之一。</p><h2>ref 与 reactive</h2><p>const count = ref(0)</p>',
'published', 'https://picsum.photos/seed/vue3/800/400', '2026-05-08 14:30:00', NOW(), NOW()),

('TypeScript 高级类型技巧', 'typescript-advanced-types', '掌握 TypeScript 的高级类型体操，提升代码类型安全。',
'## 条件类型\n\nTypeScript 的条件类型让我们可以根据类型条件进行推断：\n\ntype IsString<T> = T extends string ? true : false\n\n## 映射类型\n\n映射类型可以基于已有类型创建新类型...\n\n## 总结\n\n掌握高级类型让 TypeScript 开发更加高效。',
'<h2>条件类型</h2><p>TypeScript 的条件类型让我们可以根据类型条件进行推断。</p>',
'published', 'https://picsum.photos/seed/ts/800/400', '2026-05-05 09:00:00', NOW(), NOW()),

('CSS Grid 布局完全攻略', 'css-grid-complete-guide', '从基础到进阶，全面掌握 CSS Grid 布局方案。',
'## 什么是 CSS Grid\n\nCSS Grid 是一种二维布局系统，可以同时控制行和列。\n\n## 基础用法\n\n.container { display: grid; grid-template-columns: repeat(3, 1fr); }\n\n## 总结\n\nCSS Grid 是现代布局的利器。',
'<h2>什么是 CSS Grid</h2><p>CSS Grid 是一种二维布局系统。</p>',
'draft', 'https://picsum.photos/seed/cssgrid/800/400', NULL, NOW(), NOW()),

('JavaScript 异步编程演进', 'javascript-async-evolution', '从回调地狱到 async/await，JavaScript 异步编程的演进历程。',
'## 回调函数时代\n\n早期的 JavaScript 异步编程完全依赖回调函数，容易产生回调地狱。\n\n## Promise\n\nPromise 的出现极大改善了异步代码的可读性：\n\nfetch(url).then(res => res.json())\n\n## async/await\n\nasync/await 让异步代码看起来像同步代码...\n\n## 总结\n\n异步编程一直在向更好的方向发展。',
'<h2>回调函数时代</h2><p>早期的 JavaScript 异步编程完全依赖回调函数。</p><h2>Promise</h2><p>fetch(url).then(res => res.json())</p>',
'hidden', 'https://picsum.photos/seed/jsasync/800/400', '2026-04-20 16:00:00', NOW(), NOW());

INSERT INTO post_tags (post_id, tags_id)
SELECT p.id, t.id FROM posts p
JOIN tags t ON t.slug IN ('javascript', 'nuxt')
WHERE p.slug = 'nuxt4-getting-started';

INSERT INTO post_tags (post_id, tags_id)
SELECT p.id, t.id FROM posts p
JOIN tags t ON t.slug IN ('vue', 'javascript')
WHERE p.slug = 'vue3-composition-api-deep-dive';

INSERT INTO post_tags (post_id, tags_id)
SELECT p.id, t.id FROM posts p
JOIN tags t ON t.slug IN ('typescript')
WHERE p.slug = 'typescript-advanced-types';

INSERT INTO post_tags (post_id, tags_id)
SELECT p.id, t.id FROM posts p
JOIN tags t ON t.slug IN ('css')
WHERE p.slug = 'css-grid-complete-guide';

INSERT INTO post_tags (post_id, tags_id)
SELECT p.id, t.id FROM posts p
JOIN tags t ON t.slug IN ('javascript', 'typescript')
WHERE p.slug = 'javascript-async-evolution';

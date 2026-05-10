# Gerden Blog - Code Review 规范

## 项目信息

- **技术栈**: Nuxt 4 + TypeScript + Prisma + MySQL + Tailwind CSS
- **性质**: 个人博客项目（学习阶段）

## Code Review 规则

当用户要求 review 代码时，按以下流程执行：

### 1. 获取变更内容

```bash
# 查看最近一次 commit 的 diff
git diff HEAD~1 HEAD
# 查看 commit 信息
git log -1 --format="%H %s %ai"
```

如果有多个未 review 的 commit，逐个 review。

### 2. Review 维度

以高级前端工程师的标准，从以下维度审查：

- **代码规范**: 命名、格式、结构是否符合社区最佳实践
- **类型安全**: TypeScript 类型使用是否正确、是否滥用 any
- **Nuxt 约定**: 是否遵循 Nuxt 4 的目录结构和约定（app/ 目录、auto-imports、server routes 等）
- **组件设计**: 单一职责、props/emits 定义、插槽使用是否合理
- **性能**: 是否存在不必要的重渲染、内存泄漏、大包体积风险
- **安全性**: XSS、SQL 注入、CSRF 等常见安全问题
- **Tailwind CSS**: 类名使用是否规范、是否有重复模式可抽取
- **Prisma**: Schema 设计、查询效率、事务使用
- **可维护性**: 代码是否易读、易扩展、易测试

### 3. 输出 Review 结果

#### 3.1 直接回复用户

在对话中给出清晰的 review 反馈：
- 指出具体文件和行号
- 说明问题原因
- 给出改进后的代码示例
- 按严重程度分类（必须修复 / 建议改进 / 最佳实践建议）

#### 3.2 写入 `总结.md`

在项目根目录的 `总结.md` 文件中追加记录，格式如下：

```markdown
## #<序号> - <日期>

**Commit**: `<commit hash>` - <commit message>

### 错误/改进项

**1. <问题标题>**
- **文件**: `path/to/file.ts:行号`
- **问题代码**:
  ```代码语言
  // 有问题的代码片段
  ```
- **错误总结**: 简要说明为什么这是个问题
- **改进方案**:
  ```代码语言
  // 改进后的代码
  ```

---
```

每次追加到文件末尾，序号递增。如果该 commit 没有问题，也记录一条表示已审查通过。

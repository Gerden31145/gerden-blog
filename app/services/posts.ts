// 博客文章相关API模块
import type { PostList, Posts } from "~/types/posts";

export const PostApi = {
  getList() { // 获取博客文章列表
    return useAPI<PostList>('posts')
  }
}
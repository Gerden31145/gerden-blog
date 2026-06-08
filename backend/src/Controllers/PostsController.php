<?php

namespace App\Controller;

use App\Core\Response;
use App\Repositories\PostsRepository;
use App\Services\MarkdownService;

class PostsController
{
  private PostsRepository $PostRepo;

  public function __construct()
  {
    $this->PostRepo = new PostsRepository();
  }

  public function index(array $param = [])
  {
    $posts = $this->PostRepo->findPublishedList();
    Response::success($posts, '博客列表查询成功');
  }

  public function show(array $param = []): void
  {
    $slug = $param['slug'] ?? '';

    if ($slug === '') {
      Response::error('缺少slug');
    }

    $post = $this->PostRepo->findBySlug($slug);

    if (!$post) {
      Response::error('文章不存在', 404);
    }

    Response::success($post, '文章获取成功');
  }

  public function store(array $param = []): void
  {
    $meta = $_POST['meta'] ?? '';

    if ($meta === '') {
      Response::error('meta 不能为空', 400);
    }

    $metaData = json_decode($meta, true);

    if (!is_array($metaData)) {
      Response::error('meta 格式错误', 400);
    }

    if (empty($metaData['title'])) {
      Response::error('标题不能为空', 400);
    }

    if (!isset($_FILES['file'])) {
      Response::error('请上传文件', 400);
    }

    $file = $_FILES['file'];

    $filename = $file['name'] ?? '';

    if (!str_ends_with($filename, '.md')) {
      Response::error('请上传md文件', 400);
    }

    $contentMd = file_get_contents($file['tmp_name']);

    if ($contentMd === false) {
      Response::error('读取文件失败', 400);
    }

    $rendered = MarkdownService::render($contentMd);

    $payload = [
      'title' => $metaData['title'],
      'summary' => $metaData['summary'] ?? '',
      'slug' => $metaData['slug'] ?? null,
      'post_status' => $metaData['post_status'] ?? 'draft',
      'tags' => $metaData['tags'] ?? [],
      'content' => $contentMd,
      'contentHTML' => $rendered['html'],
      'toc' => $rendered['toc'],
    ];

    $createdPost = $this->PostRepo->create($payload);

    Response::success($createdPost, '创建文章成功', 201);
  }

  public function destroy(array $param = []): void
  {
    $id = isset($param['id']) ? (int)$param['id'] : -1;

    if ($id <= -1) {
      Response::error('文章 id 不合法', 400);
    }

    $deleted = $this->PostRepo->deleteById($id);

    if (!$deleted) {
      Response::error('文章不存在', 404);
    }

    Response::success(null, '删除文章成功');
  }

  public function update(array $param = []): void
  {
    $id = isset($param['id']) ? (int)$param['id'] : -1;

    if ($id <= -1) {
      Response::error('文章 id 不合法', 400);
    }

    $meta = $_POST['meta'] ?? '';

    if ($meta === '') {
      Response::error('meta 不能为空', 400);
    }

    $metaData = json_decode($meta, true);

    if (!is_array($metaData)) {
      Response::error('meta 格式错误', 400);
    }

    if (empty($metaData['title'])) {
      Response::error('标题不能为空', 400);
    }

    if (
      !isset($_FILES['file']) || $_FILES['file']['error'] !==
      UPLOAD_ERR_OK
    ) {
      Response::error('请上传 markdown 文件', 400);
    }

    $file = $_FILES['file'];
    $filename = $file['name'] ?? '';

    if (!str_ends_with($filename, '.md')) {
      Response::error('请上传 md 文件', 400);
    }

    $contentMd = file_get_contents($file['tmp_name']);

    if ($contentMd === false) {
      Response::error('读取文件失败', 400);
    }

    $rendered = MarkdownService::render($contentMd);

    $payload = [
      'title' => trim($metaData['title']),
      'summary' => $metaData['summary'] ?? '',
      'post_status' => $metaData['post_status'] ?? 'draft',
      'tags' => $metaData['tags'] ?? [],
      'content' => $contentMd,
      'contentHTML' => $rendered['html'],
      'toc' => $rendered['toc'],
    ];

    $updatedPost = $this->PostRepo->updateById($id, $payload);

    if (!$updatedPost) {
      Response::error('文章不存在', 404);
    }

    Response::success($updatedPost, '更新文章成功');
  }
}

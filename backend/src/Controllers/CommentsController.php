<?php

namespace App\Controller;

use App\Core\Response;
use App\Middleware\AuthMiddleware;
use App\Repositories\CommentsRepository;

class CommentsController
{
  private CommentsRepository $commentsRepo;

  public function __construct()
  {
    $this->commentsRepo = new CommentsRepository();
  }

  public function index(array $param = []): void
  {
    $postId = isset($param['id']) ? (int)$param['id'] : 0;

    if ($postId <= 0) {
      Response::error('文章 id 不合法', 400);
    }

    if (!$this->commentsRepo->publishedPostExists($postId)) {
      Response::error('文章不存在', 404);
    }

    $comments = $this->commentsRepo->findByPostIdAndStatus($postId, 'visible');

    Response::success($comments, '评论列表查询成功');
  }

  public function store(array $param = []): void
  {
    $postId = isset($param['id']) ? (int)$param['id'] : 0;

    if ($postId <= 0) {
      Response::error('文章 id 不合法', 400);
    }

    $user = AuthMiddleware::requireAuth();

    if (!$this->commentsRepo->publishedPostExists($postId)) {
      Response::error('文章不存在', 404);
    }

    $body = $this->jsonBody();
    $content = trim((string)($body['content'] ?? ''));

    if ($content === '') {
      Response::error('评论内容不能为空', 400);
    }

    if ($this->contentLength($content) > 1000) {
      Response::error('评论内容不能超过 1000 字', 400);
    }

    $comment = $this->commentsRepo->create(
      $postId,
      (int)$user['id'],
      $content
    );

    Response::success($comment, '评论创建成功', 201);
  }

  public function destroy(array $param = []): void
  {
    $commentId = isset($param['id']) ? (int)$param['id'] : 0;

    if ($commentId <= 0) {
      Response::error('评论 id 不合法', 400);
    }

    $user = AuthMiddleware::requireAuth();
    $comment = $this->commentsRepo->findById($commentId);

    if (!$comment) {
      Response::error('评论不存在', 404);
    }

    $isOwner = (int)$comment['user_id'] === (int)$user['id'];
    $isAdmin = $user['role'] === 'admin';

    if (!$isOwner && !$isAdmin) {
      Response::error('无权限删除该评论', 403);
    }

    $this->commentsRepo->softDeleteById($commentId);

    Response::success(null, '评论删除成功');
  }

  private function jsonBody(): array
  {
    $rawBody = file_get_contents('php://input');

    if ($rawBody === false || trim($rawBody) === '') {
      return [];
    }

    $data = json_decode($rawBody, true);

    return is_array($data) ? $data : [];
  }

  private function contentLength(string $content): int
  {
    if (function_exists('mb_strlen')) {
      return mb_strlen($content, 'UTF-8');
    }

    return strlen($content);
  }
}

<?php

namespace App\Controller;

use App\Core\Response;
use App\Repositories\PostsRepository;

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
}

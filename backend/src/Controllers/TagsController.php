<?php

namespace App\Controller;

use App\Core\Response;
use App\Core\Router;
use App\Repositories\TagRepository;

class TagsController
{
  private TagRepository $tagRepo;

  public function __construct()
  {
    $this->tagRepo = new TagRepository();
  }

  public function index(array $param = []): void
  {
    $tag = $this->tagRepo->findAll();
    Response::success($tag, '获取标签成功');
  }
}

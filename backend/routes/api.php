<?php

use App\Controller\healthController;
use App\Controller\TagsController;
use App\Controller\PostsController;

$router->addPath('/api/health', 'GET', [new healthController(), 'index']);
$router->addPath('/api/tags', 'GET', [new TagsController(), 'index']);
$router->addPath('/api/posts', 'GET', [new PostsController(), 'index']);
$router->addPath('/api/posts/{slug}', 'GET', [new PostsController(), 'show']);
$router->addPath('/api/admin/posts', 'POST', [new PostsController(), 'store']);
$router->addPath('/api/admin/posts/{id}', 'DELETE', [new PostsController(), 'destroy']);
$router->addPath('api/admin/posts/{id}/update', 'POST', [new PostsController(), 'update']);

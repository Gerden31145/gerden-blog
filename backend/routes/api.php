<?php

use App\Controller\healthController;
use App\Controller\TagsController;
use App\Controller\PostsController;
use App\Controller\AuthController;

$router->addPath('/api/health', 'GET', [new healthController(), 'index']);
$router->addPath('/api/tags', 'GET', [new TagsController(), 'index']);
$router->addPath('/api/posts', 'GET', [new PostsController(), 'index']);
$router->addPath('/api/posts/{slug}', 'GET', [new PostsController(), 'show']);
$router->addPath('/api/register', 'POST', [new AuthController(), 'register']);
$router->addPath('/api/login', 'POST', [new AuthController(), 'login']);
$router->addPath('/api/logout', 'POST', [new AuthController(), 'logout']);
$router->addPath('/api/me', 'GET', [new AuthController(), 'me']);
$router->addPath('/api/admin/login', 'POST', [new AuthController(), 'adminLogin']);
$router->addPath('/api/admin/me', 'GET', [new AuthController(), 'adminMe']);
$router->addPath('/api/admin/logout', 'POST', [new AuthController(), 'logout']);
$router->addPath('/api/admin/posts', 'POST', [new PostsController(), 'store']);
$router->addPath('/api/admin/posts/{id}', 'DELETE', [new PostsController(), 'destroy']);
$router->addPath('/api/admin/posts/{id}/update', 'POST', [new PostsController(), 'update']);

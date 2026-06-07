<?php

use App\Controller\healthController;
use App\Controller\TagsController;
use App\Controller\PostsController;

$router->addPath('/api/health', 'GET', [new healthController(), 'index']);
$router->addPath('/api/tags', 'GET', [new TagsController(), 'index']);
$router->addPath('/api/posts', 'GET', [new PostsController(), 'index']);

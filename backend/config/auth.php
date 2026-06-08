<?php

return [
  'jwt_secret' => getenv('JWT_SECRET') ?: 'gerden-shop-local-dev-secret-please-change-before-production-20260608',
  'jwt_algorithm' => 'HS256',
  'jwt_expire_seconds' => 60 * 60 * 24,

  'cookie_name' => 'access_token',
  'cookie_path' => '/',
  'cookie_secure' => false,
  'cookie_http_only' => true,
  'cookie_same_site' => 'Lax',
];

-- CreateTable
CREATE TABLE `post_tags` (
    `post_id` BIGINT UNSIGNED NOT NULL,
    `tags_id` BIGINT UNSIGNED NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_post_tags_tags_id`(`tags_id`),
    PRIMARY KEY (`post_id`, `tags_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `posts` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(255) NOT NULL,
    `slug` VARCHAR(255) NOT NULL,
    `summary` TEXT NULL,
    `content` LONGTEXT NOT NULL,
    `content_html` LONGTEXT NULL,
    `post_status` ENUM('draft', 'published', 'hidden') NOT NULL DEFAULT 'draft',
    `cover_image` VARCHAR(500) NULL,
    `published_at` DATETIME(0) NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `uk_posts_slug`(`slug`),
    INDEX `idx_posts_created_at`(`created_at`),
    INDEX `idx_posts_published_at`(`published_at`),
    INDEX `idx_posts_status`(`post_status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tags` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `slug` VARCHAR(100) NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `uk_tags_name`(`name`),
    UNIQUE INDEX `uk_tags_slug`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `post_tags` ADD CONSTRAINT `fk_post_tags_post` FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `post_tags` ADD CONSTRAINT `fk_post_tags_tag` FOREIGN KEY (`tags_id`) REFERENCES `tags`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

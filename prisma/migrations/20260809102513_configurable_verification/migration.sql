-- AlterTable
ALTER TABLE "event_settings" ADD COLUMN     "hosting_domain_pattern" TEXT NOT NULL DEFAULT '\.zerops\.app\b',
ADD COLUMN     "platform_display_name" TEXT NOT NULL DEFAULT 'Zerops',
ADD COLUMN     "required_config_file" TEXT NOT NULL DEFAULT 'zerops.yaml';

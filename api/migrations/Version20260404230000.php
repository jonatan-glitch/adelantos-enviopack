<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260404230000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add documento_url field to proforma table';
    }

    public function up(Schema $schema): void
    {
        $this->addSql("ALTER TABLE proforma ADD COLUMN IF NOT EXISTS documento_url VARCHAR(255) DEFAULT NULL");
    }

    public function down(Schema $schema): void
    {
        $this->addSql("ALTER TABLE proforma DROP COLUMN IF EXISTS documento_url");
    }
}

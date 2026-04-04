<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260404140000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add cbu and banco fields to chofer table';
    }

    public function up(Schema $schema): void
    {
        $this->addSql("ALTER TABLE chofer ADD COLUMN IF NOT EXISTS cbu VARCHAR(50) DEFAULT NULL");
        $this->addSql("ALTER TABLE chofer ADD COLUMN IF NOT EXISTS banco VARCHAR(100) DEFAULT NULL");
    }

    public function down(Schema $schema): void
    {
        $this->addSql("ALTER TABLE chofer DROP COLUMN IF EXISTS cbu");
        $this->addSql("ALTER TABLE chofer DROP COLUMN IF EXISTS banco");
    }
}

<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260406180000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add motivo_rechazo column to factura table';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE factura ADD COLUMN motivo_rechazo TEXT DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE factura DROP COLUMN motivo_rechazo');
    }
}

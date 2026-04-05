<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260405120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add comprobante_pago_url and fecha_pago fields to factura table';
    }

    public function up(Schema $schema): void
    {
        $this->addSql("ALTER TABLE factura ADD COLUMN IF NOT EXISTS comprobante_pago_url VARCHAR(500) DEFAULT NULL");
        $this->addSql("ALTER TABLE factura ADD COLUMN IF NOT EXISTS fecha_pago TIMESTAMP DEFAULT NULL");
    }

    public function down(Schema $schema): void
    {
        $this->addSql("ALTER TABLE factura DROP COLUMN IF EXISTS comprobante_pago_url");
        $this->addSql("ALTER TABLE factura DROP COLUMN IF EXISTS fecha_pago");
    }
}

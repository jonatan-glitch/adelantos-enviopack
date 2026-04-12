<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260412160000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create disponibilidad_diaria table for daily driver availability tracking';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE disponibilidad_diaria (
            id SERIAL PRIMARY KEY,
            fecha DATE NOT NULL,
            choferes_ids JSON NOT NULL DEFAULT \'[]\',
            choferes_manuales JSON NOT NULL DEFAULT \'[]\',
            enviado BOOLEAN NOT NULL DEFAULT FALSE,
            enviado_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL,
            created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
            updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL
        )');
        $this->addSql('CREATE UNIQUE INDEX uq_disponibilidad_fecha ON disponibilidad_diaria (fecha)');
        $this->addSql("COMMENT ON COLUMN disponibilidad_diaria.enviado_at IS '(DC2Type:datetime_immutable)'");
        $this->addSql("COMMENT ON COLUMN disponibilidad_diaria.created_at IS '(DC2Type:datetime_immutable)'");
        $this->addSql("COMMENT ON COLUMN disponibilidad_diaria.updated_at IS '(DC2Type:datetime_immutable)'");
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE disponibilidad_diaria');
    }
}

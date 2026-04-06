<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260406120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create invitacion_usuario table for admin/supervisor user invitations';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE invitacion_usuario (
            id SERIAL PRIMARY KEY,
            email VARCHAR(180) NOT NULL,
            token VARCHAR(64) NOT NULL,
            rol VARCHAR(40) NOT NULL,
            expira_en TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
            usado BOOLEAN NOT NULL DEFAULT FALSE,
            invitado_por VARCHAR(200) DEFAULT NULL,
            created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL
        )');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_invitacion_usuario_token ON invitacion_usuario (token)');
        $this->addSql("COMMENT ON COLUMN invitacion_usuario.expira_en IS '(DC2Type:datetime_immutable)'");
        $this->addSql("COMMENT ON COLUMN invitacion_usuario.created_at IS '(DC2Type:datetime_immutable)'");
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE invitacion_usuario');
    }
}

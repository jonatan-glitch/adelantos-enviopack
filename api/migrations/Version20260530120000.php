<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260530120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Normalize all usuario emails to lowercase, deduplicate (keep latest, soft-delete older)';
    }

    public function up(Schema $schema): void
    {
        // Step 1: Soft-delete the older duplicate when same lowercased email exists more than once
        // (keep the one with highest id — latest registered)
        $this->addSql("
            UPDATE usuario
            SET eliminado = true
            WHERE id IN (
                SELECT u1.id FROM usuario u1
                INNER JOIN usuario u2
                    ON LOWER(u1.email) = LOWER(u2.email)
                    AND u1.id < u2.id
                    AND u1.eliminado = false
                    AND u2.eliminado = false
            )
        ");

        // Step 2: Lowercase all remaining emails
        $this->addSql("UPDATE usuario SET email = LOWER(email) WHERE email != LOWER(email)");

        // Step 3: Lowercase any pending invitations
        $this->addSql("UPDATE invitacion_chofer SET email = LOWER(email) WHERE email != LOWER(email) AND email IS NOT NULL");
        $this->addSql("UPDATE invitacion_usuario SET email = LOWER(email) WHERE email != LOWER(email) AND email IS NOT NULL");
    }

    public function down(Schema $schema): void
    {
        // No revertible
    }
}

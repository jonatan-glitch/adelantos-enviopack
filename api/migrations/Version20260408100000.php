<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260408100000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Capitalize nombre and apellido (Title Case) for all existing users';
    }

    public function up(Schema $schema): void
    {
        $this->addSql("UPDATE usuario SET nombre = INITCAP(LOWER(nombre)), apellido = INITCAP(LOWER(apellido))");
    }

    public function down(Schema $schema): void
    {
        // No revertible — data transformation
    }
}

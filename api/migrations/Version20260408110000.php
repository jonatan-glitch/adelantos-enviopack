<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260408110000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Fix user with email stored as apellido (Eliana Nahir Popp)';
    }

    public function up(Schema $schema): void
    {
        $this->addSql("UPDATE usuario SET nombre = 'Eliana Nahir', apellido = 'Popp' WHERE email = 'eliana@enviopack.com'");
    }

    public function down(Schema $schema): void
    {
        // No revertible
    }
}

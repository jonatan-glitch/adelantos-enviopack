<?php

namespace App\Constant;

class RolConstant
{
    public const ROLE_ENVIOPACK_ADMIN = 'ROLE_ENVIOPACK_ADMIN';
    public const ROLE_OWNER           = 'ROLE_OWNER';
    public const ROLE_ADMINISTRADOR   = 'ROLE_ADMINISTRADOR';
    public const ROLE_SUPERVISOR      = 'ROLE_SUPERVISOR';
    public const ROLE_CONDUCTOR       = 'ROLE_CONDUCTOR';

    public const ROLES_ADMIN = [
        self::ROLE_ENVIOPACK_ADMIN,
        self::ROLE_OWNER,
        self::ROLE_ADMINISTRADOR,
    ];

    /** Roles that can access admin panel (includes read-only supervisor) */
    public const ROLES_ADMIN_PANEL = [
        self::ROLE_ENVIOPACK_ADMIN,
        self::ROLE_OWNER,
        self::ROLE_ADMINISTRADOR,
        self::ROLE_SUPERVISOR,
    ];

    /** Roles assignable when inviting a new user */
    public const ROLES_INVITABLES = [
        self::ROLE_OWNER           => 'Owner',
        self::ROLE_ADMINISTRADOR   => 'Administrador',
        self::ROLE_SUPERVISOR      => 'Supervisor Operativo',
    ];

    public const ROLES_USUARIO = [
        self::ROLE_ENVIOPACK_ADMIN,
        self::ROLE_OWNER,
        self::ROLE_ADMINISTRADOR,
        self::ROLE_SUPERVISOR,
        self::ROLE_CONDUCTOR,
    ];
}

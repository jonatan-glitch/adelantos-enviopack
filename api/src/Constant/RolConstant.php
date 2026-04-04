<?php

namespace App\Constant;

class RolConstant
{
    public const ROLE_ENVIOPACK_ADMIN = 'ROLE_ENVIOPACK_ADMIN';
    public const ROLE_OWNER           = 'ROLE_OWNER';
    public const ROLE_ADMINISTRADOR   = 'ROLE_ADMINISTRADOR';
    public const ROLE_CONDUCTOR       = 'ROLE_CONDUCTOR';

    public const ROLES_ADMIN = [
        self::ROLE_ENVIOPACK_ADMIN,
        self::ROLE_OWNER,
        self::ROLE_ADMINISTRADOR,
    ];

    public const ROLES_USUARIO = [
        self::ROLE_ENVIOPACK_ADMIN,
        self::ROLE_OWNER,
        self::ROLE_ADMINISTRADOR,
        self::ROLE_CONDUCTOR,
    ];
}

<?php

namespace App\Exception;

class ValidationException extends \RuntimeException
{
    public function __construct(private array $errors)
    {
        parent::__construct('Error de validación');
    }

    public function getErrors(): array { return $this->errors; }
}

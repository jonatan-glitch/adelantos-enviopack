<?php

namespace App\Exception;

class DomainException extends \RuntimeException
{
    public function __construct(string $message, private array $params = [])
    {
        parent::__construct($message);
    }

    public function getParams(): array { return $this->params; }
}

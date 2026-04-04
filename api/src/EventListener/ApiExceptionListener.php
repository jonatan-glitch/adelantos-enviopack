<?php

namespace App\EventListener;

use App\Exception\DomainException;
use App\Exception\ValidationException;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Event\ExceptionEvent;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\Security\Core\Exception\AccessDeniedException;
use Symfony\Component\Security\Core\Exception\AuthenticationException;

class ApiExceptionListener
{
    public function onKernelException(ExceptionEvent $event): void
    {
        $exception = $event->getThrowable();
        $request   = $event->getRequest();

        if (!str_starts_with($request->getPathInfo(), '/api')) {
            return;
        }

        if ($exception instanceof ValidationException) {
            $event->setResponse(new JsonResponse([
                'code'    => 422,
                'message' => 'Error de validación',
                'errors'  => $exception->getErrors(),
            ], 422));
            return;
        }

        if ($exception instanceof DomainException) {
            $event->setResponse(new JsonResponse([
                'code'    => 400,
                'message' => $exception->getMessage(),
            ], 400));
            return;
        }

        if ($exception instanceof AccessDeniedException) {
            // If there's no Authorization header the user isn't authenticated at all → 401
            $hasToken = $request->headers->has('Authorization');
            $code     = $hasToken ? 403 : 401;
            $message  = $hasToken ? 'Acceso denegado.' : 'No autenticado.';
            $event->setResponse(new JsonResponse(['code' => $code, 'message' => $message], $code));
            return;
        }

        if ($exception instanceof AuthenticationException) {
            $event->setResponse(new JsonResponse([
                'code'    => 401,
                'message' => 'No autenticado.',
            ], 401));
            return;
        }

        if ($exception instanceof HttpExceptionInterface) {
            $event->setResponse(new JsonResponse([
                'code'    => $exception->getStatusCode(),
                'message' => $exception->getMessage() ?: 'Error',
            ], $exception->getStatusCode()));
            return;
        }

        $event->setResponse(new JsonResponse([
            'code'    => 500,
            'message' => 'Error interno del servidor',
        ], 500));
    }
}

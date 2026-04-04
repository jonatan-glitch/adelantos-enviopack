<?php

namespace App\EventListener;

use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Event\ResponseEvent;

class ApiResponseListener
{
    public function onKernelResponse(ResponseEvent $event): void
    {
        $request  = $event->getRequest();
        $response = $event->getResponse();

        if (!str_starts_with($request->getPathInfo(), '/api')) {
            return;
        }

        // Skip login/refresh — lexik already formats those
        $skip = ['/api/login', '/api/token/refresh'];
        if (in_array($request->getPathInfo(), $skip)) {
            return;
        }

        if (!$response instanceof JsonResponse) {
            return;
        }

        $data = json_decode($response->getContent(), true);

        // Already wrapped or is an error response
        if (isset($data['data']) || isset($data['code']) || isset($data['errors'])) {
            return;
        }

        $response->setData(['data' => $data]);
    }
}

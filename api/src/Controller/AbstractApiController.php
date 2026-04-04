<?php

namespace App\Controller;

use App\Entity\Usuario;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

abstract class AbstractApiController extends AbstractController
{
    protected function getUsuario(): Usuario
    {
        /** @var Usuario $user */
        $user = $this->getUser();
        return $user;
    }

    protected function ok(mixed $data): JsonResponse
    {
        return new JsonResponse($data, Response::HTTP_OK);
    }

    protected function created(mixed $data): JsonResponse
    {
        return new JsonResponse($data, Response::HTTP_CREATED);
    }

    protected function noContent(): JsonResponse
    {
        return new JsonResponse(null, Response::HTTP_NO_CONTENT);
    }

    protected function paginated(array $items, int $total, int $page, int $limit): JsonResponse
    {
        return $this->ok([
            'items'    => $items,
            'paginate' => [
                'total'   => $total,
                'pagina'  => $page,
                'paginas' => (int) ceil($total / max($limit, 1)),
                'ppp'     => $limit,
            ],
        ]);
    }
}

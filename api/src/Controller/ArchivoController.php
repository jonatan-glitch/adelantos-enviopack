<?php

namespace App\Controller;

use App\Repository\ArchivoRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

class ArchivoController extends AbstractController
{
    public function __construct(
        private ArchivoRepository $archivoRepo,
    ) {}

    #[Route('/api/archivos/{id}', name: 'archivo_servir', methods: ['GET'])]
    public function servir(int $id): Response
    {
        $archivo = $this->archivoRepo->find($id);
        if (!$archivo) {
            return new Response('Archivo no encontrado.', 404);
        }

        $contenido = $archivo->getContenido();
        if (is_resource($contenido)) {
            $contenido = stream_get_contents($contenido);
        }

        return new Response($contenido, 200, [
            'Content-Type'        => $archivo->getMimeType(),
            'Content-Disposition' => 'inline; filename="' . $archivo->getNombre() . '"',
        ]);
    }
}

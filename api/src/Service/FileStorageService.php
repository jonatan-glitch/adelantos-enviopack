<?php

namespace App\Service;

use App\Entity\Archivo;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\File\UploadedFile;

class FileStorageService
{
    public function __construct(
        private EntityManagerInterface $em,
    ) {}

    /**
     * Store an uploaded file in the database and return its public URL.
     */
    public function store(UploadedFile $file): string
    {
        $archivo = new Archivo();
        $archivo->setNombre($file->getClientOriginalName());
        $archivo->setMimeType($file->getClientMimeType() ?: 'application/octet-stream');
        $archivo->setContenido(file_get_contents($file->getPathname()));

        $this->em->persist($archivo);
        $this->em->flush();

        return '/api/archivos/' . $archivo->getId();
    }
}

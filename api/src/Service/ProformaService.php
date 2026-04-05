<?php

namespace App\Service;

use App\Entity\ConfiguracionSistema;
use App\Entity\Proforma;
use App\Repository\ChoferRepository;
use App\Repository\ConfiguracionSistemaRepository;
use App\Repository\ProformaRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\File\UploadedFile;

class ProformaService
{
    public function __construct(
        private EntityManagerInterface         $em,
        private ChoferRepository               $choferRepo,
        private ProformaRepository             $proformaRepo,
        private ConfiguracionSistemaRepository $configRepo,
        private S3Service                      $s3,
        private EmailService                   $emailService,
    ) {}

    public function crear(array $data, ?UploadedFile $file = null): Proforma
    {
        $chofer = $this->choferRepo->find($data['chofer_id']);
        if (!$chofer) {
            throw new \App\Exception\DomainException('Chofer no encontrado.');
        }

        $config = $this->configRepo->find(1) ?? new ConfiguracionSistema();
        $tasa   = isset($data['tasa_aplicada'])
            ? (float)$data['tasa_aplicada']
            : ($chofer->getTasaPersonal() ?? $config->getTasaGlobal());

        $proforma = new Proforma();
        $proforma->setChofer($chofer);
        $proforma->setPeriodo($data['periodo']);
        $proforma->setMonto((float)$data['monto']);
        $proforma->setTasaAplicada($tasa);
        $proforma->setFechaVencimiento(new \DateTimeImmutable($data['fecha_vencimiento']));
        $proforma->setDescripcion($data['descripcion'] ?? null);

        // Upload document to S3/R2 if provided
        if ($file && $this->s3->isConfigured()) {
            $ext = $file->guessExtension() ?: 'bin';
            $key = 'proformas/' . date('Y/m') . '/' . bin2hex(random_bytes(8)) . '.' . $ext;
            $url = $this->s3->upload($file->getPathname(), $key, $file->getMimeType());
            $proforma->setDocumentoUrl($url);
        }

        $this->em->persist($proforma);
        $this->em->flush();

        // Notify chofer via email
        $this->emailService->sendProformaNotificacion(
            $chofer->getEmail(),
            $chofer->getNombre(),
            $proforma
        );

        return $proforma;
    }

    public function listar(int $page, int $limit, ?int $chofer_id = null): array
    {
        $offset = ($page - 1) * $limit;
        $qb = $this->em->createQueryBuilder()
            ->select('p')
            ->from(Proforma::class, 'p')
            ->where('p.eliminado = false')
            ->orderBy('p.created_at', 'DESC')
            ->setMaxResults($limit)
            ->setFirstResult($offset);

        if ($chofer_id) {
            $qb->andWhere('p.chofer = :chofer')->setParameter('chofer', $chofer_id);
        }

        $items = $qb->getQuery()->getResult();

        $cqb = $this->em->createQueryBuilder()
            ->select('COUNT(p.id)')->from(Proforma::class, 'p')->where('p.eliminado = false');
        if ($chofer_id) {
            $cqb->andWhere('p.chofer = :chofer')->setParameter('chofer', $chofer_id);
        }
        $total = (int)$cqb->getQuery()->getSingleScalarResult();

        return ['items' => $items, 'total' => $total];
    }
}

<?php

namespace App\Controller\Chofer;

use App\Controller\AbstractApiController;
use App\Entity\Proforma;
use App\Repository\ChoferRepository;
use App\Response\ProformaResponse;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;

#[Route('/api/proformas')]
class ProformaController extends AbstractApiController
{
    public function __construct(
        private EntityManagerInterface $em,
        private ChoferRepository       $choferRepo,
    ) {}

    #[Route('', name: 'chofer_proformas_listar', methods: ['GET'])]
    public function listar(Request $request): JsonResponse
    {
        $usuario = $this->getUsuario();
        $chofer  = $this->choferRepo->findOneBy(['usuario' => $usuario, 'eliminado' => false]);
        if (!$chofer) {
            return $this->paginated([], 0, 1, 50);
        }

        $page   = max(1, (int)$request->query->get('page', 1));
        $limit  = min(200, max(1, (int)$request->query->get('limit', 50)));
        $offset = ($page - 1) * $limit;

        $qb = $this->em->createQueryBuilder()
            ->select('p')
            ->from(Proforma::class, 'p')
            ->where('p.chofer = :chofer')
            ->andWhere('p.eliminado = false')
            ->setParameter('chofer', $chofer)
            ->orderBy('p.created_at', 'DESC')
            ->setMaxResults($limit)
            ->setFirstResult($offset);

        $items = array_map(fn($p) => ProformaResponse::fromEntity($p), $qb->getQuery()->getResult());

        $total = (int) $this->em->createQueryBuilder()
            ->select('COUNT(p.id)')
            ->from(Proforma::class, 'p')
            ->where('p.chofer = :chofer')
            ->andWhere('p.eliminado = false')
            ->setParameter('chofer', $chofer)
            ->getQuery()->getSingleScalarResult();

        return $this->paginated($items, $total, $page, $limit);
    }
}

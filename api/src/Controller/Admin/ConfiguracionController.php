<?php

namespace App\Controller\Admin;

use App\Controller\AbstractApiController;
use App\Entity\ConfiguracionSistema;
use App\Repository\ConfiguracionSistemaRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;

#[Route('/api/admin/configuracion')]
class ConfiguracionController extends AbstractApiController
{
    public function __construct(
        private ConfiguracionSistemaRepository $configRepo,
        private EntityManagerInterface         $em,
    ) {}

    #[Route('', name: 'admin_configuracion_obtener', methods: ['GET'])]
    public function obtener(): JsonResponse
    {
        $config = $this->configRepo->find(1) ?? new ConfiguracionSistema();
        return $this->ok($this->toArray($config));
    }

    #[Route('', name: 'admin_configuracion_actualizar', methods: ['PUT'])]
    public function actualizar(Request $request): JsonResponse
    {
        $data   = json_decode($request->getContent(), true) ?? [];
        $config = $this->configRepo->find(1);
        if (!$config) {
            $config = new ConfiguracionSistema();
            $this->em->persist($config);
        }
        if (isset($data['tasa_global']))                  { $config->setTasaGlobal((float)$data['tasa_global']); }
        if (isset($data['dias_cobro_normal']))             { $config->setDiasCobroNormal((int)$data['dias_cobro_normal']); }
        if (isset($data['plazo_acreditacion_horas']))      { $config->setPlazoAcreditacionHoras((int)$data['plazo_acreditacion_horas']); }
        if (isset($data['emails_notificacion_admin']))     { $config->setEmailsNotificacionAdmin($data['emails_notificacion_admin']); }
        $this->em->flush();
        return $this->ok($this->toArray($config));
    }

    private function toArray(ConfiguracionSistema $c): array
    {
        return [
            'tasa_global'                 => $c->getTasaGlobal(),
            'dias_cobro_normal'           => $c->getDiasCobroNormal(),
            'plazo_acreditacion_horas'    => $c->getPlazoAcreditacionHoras(),
            'emails_notificacion_admin'   => $c->getEmailsNotificacionAdmin(),
        ];
    }
}

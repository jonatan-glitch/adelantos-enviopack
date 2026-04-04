# Blueprint del Proyecto TMS - Guía para Replicar la Arquitectura

> Este documento describe en detalle la arquitectura, stack tecnológico, patrones y convenciones del sistema TMS (Transportation Management System) de Enviopack. Su objetivo es servir como referencia para que un agente o desarrollador pueda construir un nuevo sistema siguiendo exactamente las mismas directivas.

---

## Índice

1. [Visión General](#1-visión-general)
2. [Backend (API) - Symfony/PHP](#2-backend-api)
3. [Frontend (APP) - React/Vite](#3-frontend-app)
4. [Mobile - Expo/React Native](#4-mobile)
5. [Patrones Transversales](#5-patrones-transversales)
6. [Convenciones de Código](#6-convenciones-de-código)

---

## 1. Visión General

El proyecto TMS se compone de 3 repositorios:

| Repo | Stack | Descripción |
|------|-------|-------------|
| `api/` | Symfony 7.2 + PHP 8.2 + PostgreSQL | Backend REST API |
| `app/` | React 18 + Vite + TypeScript + Panda CSS | Frontend web (panel de administración) |
| `mobile/` | Expo 54 + React Native 0.81 + TypeScript | App mobile para conductores |

**Arquitectura general:**
- API REST con JWT (access + refresh token)
- Multi-tenancy por empresa (cada usuario pertenece a una empresa)
- Soft deletes (campo `eliminado` boolean en entidades)
- Roles jerárquicos (ENVIOPACK_ADMIN > OWNER > ADMINISTRADOR > SUPERVISOR > CONDUCTOR)
- Internacionalización en español (es_AR)
- Despliegue en AWS (CodeDeploy + S3)

---

## 2. Backend (API)

### 2.1 Stack Tecnológico

```
PHP >= 8.2
Symfony 7.2.*
Doctrine ORM 3.3 (con PHP 8 Attributes)
PostgreSQL + PostGIS
Composer (gestor de paquetes)
```

**Dependencias clave:**
- `lexik/jwt-authentication-bundle` — Autenticación JWT
- `gesdinet/jwt-refresh-token-bundle` — Refresh tokens
- `nelmio/api-doc-bundle` — Documentación OpenAPI
- `nelmio/cors-bundle` — CORS
- `symfony/messenger` — Colas async (exports, geocoding, ruteo)
- `symfony/validator` — Validación con attributes
- `symfony/serializer` — Serialización con groups
- `scienta/doctrine-json-functions` — Funciones JSONB en DQL
- `phpunit/phpunit` — Testing
- `dama/doctrine-test-bundle` — Rollback transaccional en tests

### 2.2 Estructura de Directorios

```
api/
├── bin/                    # Scripts CLI (console, phpunit, phpcs, deploy hooks)
├── config/
│   ├── packages/           # Config de bundles (security, doctrine, messenger, jwt, cors, etc.)
│   ├── services.yaml       # Definición de servicios y DI
│   ├── routes.yaml         # Rutas
│   └── tms/                # Configuración custom (ruteo, geocodificación)
├── migrations/             # Migraciones Doctrine (100+)
├── public/                 # Web root
├── src/
│   ├── Attribute/          # Attributes custom (OpenApi*, MapRequestPayloadWithGroup)
│   ├── Command/            # Comandos CLI
│   ├── Constant/           # Constantes (RolConstant, etc.)
│   ├── Controller/         # Controladores REST
│   │   ├── ApiPublica/     # Endpoints M2M (OMS, WMS) con API Key auth
│   │   └── TmsAbstractController.php  # Controller base
│   ├── Doctrine/           # Tipos Doctrine custom (JsonbType)
│   ├── Entity/             # Entidades ORM (62+)
│   ├── Enum/               # PHP Enums (EstadoEnvio, EstadoPlan, etc.)
│   ├── EventListener/      # Listeners del kernel (exception, response, JWT, auth)
│   ├── Exception/          # Excepciones custom (DomainException, ValidationException)
│   ├── Logging/            # Enums de auditoría
│   ├── Message/            # Mensajes async (exports, geocoding)
│   ├── MessageHandler/     # Handlers de mensajes
│   ├── Repository/         # Repositorios Doctrine
│   │   └── Trait/PaginadorTrait.php  # Paginación reutilizable
│   ├── Request/            # DTOs de entrada con validación
│   ├── Response/           # DTOs de salida con groups de serialización
│   ├── Security/           # Autenticación (UserProvider, ApiKeyAuthenticator, UserChecker)
│   ├── Serializer/         # Lógica de serialización custom
│   ├── Service/            # Servicios de lógica de negocio
│   └── DataFixtures/       # Fixtures para tests
├── templates/              # Templates Twig (emails)
├── tests/                  # Tests (Controller/, Service/, TestObjects)
├── translations/           # Traducciones (validators, exceptions, messages)
├── .env, .env.dev, .env.qa, .env.prod-ar, .env.test
├── composer.json
├── phpunit.xml.dist
├── phpcs-enviopack.xml     # Reglas de estilo de código
├── bitbucket-pipelines.yml # CI/CD
└── appspec.yml             # AWS CodeDeploy
```

### 2.3 Autenticación y Seguridad

#### Firewalls (security.yaml)

```yaml
firewalls:
    login:
        pattern: ^/api/login
        stateless: true
        json_login:
            check_path: /api/login
            username_path: email
            password_path: contrasena
    
    api-publica:
        pattern: ^/api-publica
        stateless: true
        custom_authenticators:
            - App\Security\ApiKeyAuthenticator  # Header: Authorization: ApiKey <key>
    
    api:
        pattern: ^/api
        stateless: true
        jwt: ~  # Lexik JWT
```

#### JWT Session Tracking

Cada JWT incluye un `id_sesion` que referencia a la entidad `SesionUsuario`. Esto permite:
- Invalidar sesiones remotamente
- Distinguir sesiones web vs mobile
- Trackear última conexión

**Listeners involucrados:**
- `JWTSessionInjectorListener` — Al crear JWT, crea/reutiliza SesionUsuario e inyecta `id_sesion` en el payload
- `JWTSessionValidatorListener` — Al decodificar JWT, valida que la sesión exista y esté activa
- `RefreshTokenInterceptorListener` — Propaga el token de sesión al hacer refresh

#### UserChecker

```php
// Pre-auth: rechaza usuarios deshabilitados
checkPreAuth(): throws CustomUserMessageAccountStatusException si habilitado = false

// Post-auth: actualiza última conexión
checkPostAuth(): usuario.ultimaConexion = now()
```

#### Roles

```php
class RolConstant {
    ROLE_ENVIOPACK_ADMIN  // Admin de plataforma (puede impersonar)
    ROLE_OWNER            // Dueño de empresa
    ROLE_ADMINISTRADOR    // Admin de empresa
    ROLE_SUPERVISOR_GENERAL
    ROLE_SUPERVISOR_TRANSPORTE
    ROLE_CONDUCTOR        // Chofer (app mobile)
    ROLE_ASISTENTE_CONDUCTOR
    ROLE_API_OMS          // Integración M2M
    ROLE_API_WMS          // Integración M2M
}

// Jerarquía:
// ROLE_OWNER hereda ROLE_ADMINISTRADOR
// ROLE_ENVIOPACK_ADMIN hereda ROLE_ALLOWED_TO_SWITCH + ROLE_OWNER
```

#### Recuperación de Contraseña

```php
// POST /recuperar-contrasena (público)
// - Valida email, crea PasswordResetToken, envía email
// - Rate limit: si ya existe token pendiente, rechaza

// PUT /recuperar-contrasena (público)
// - Valida token + nueva contraseña, actualiza password
```

### 2.4 Entidades (Doctrine ORM)

Todas las entidades usan **PHP 8 Attributes** para el mapping:

```php
#[ORM\Entity(repositoryClass: FlotaRepository::class)]
class Flota
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    private ?string $nombre = null;

    #[ORM\ManyToOne(targetEntity: Empresa::class)]
    #[ORM\JoinColumn(nullable: false)]
    private ?Empresa $empresa = null;

    #[ORM\ManyToMany(targetEntity: Vehiculo::class, mappedBy: 'flotas')]
    private Collection $vehiculos;

    #[ORM\Column]
    private bool $eliminado = false;  // SOFT DELETE

    // Getters, setters...

    public function toDto(): FlotaResponse
    {
        return FlotaResponse::fromEntity($this);
    }
}
```

**Convenciones de entidades:**
- Siempre tienen `id` (autoincrement)
- Siempre tienen `eliminado` (bool) para soft delete
- Siempre pertenecen a una `Empresa` (multi-tenancy)
- Implementan `toDto()` que retorna su Response DTO
- Nombres de propiedades en **snake_case** en español
- Roles se almacenan como JSONB array en PostgreSQL

### 2.5 Request DTOs (Validación)

Un único DTO maneja múltiples operaciones mediante **groups de validación**:

```php
class UsuarioRequest
{
    public function __construct(
        #[Assert\NotBlank(message: 'commons.email.not_blank', groups: ['crear', 'editar'])]
        #[Assert\Email(message: 'commons.email.no_valido')]
        #[Assert\Length(max: 180)]
        #[Groups(['crear', 'editar', 'editar_perfil'])]
        #[OA\Property(type: 'string', example: 'usuario@ejemplo.com')]
        public ?string $email = null,

        #[Assert\NotBlank(groups: ['crear'])]
        #[Assert\Length(min: 6, max: 50, groups: ['crear', 'modificar_contrasena'])]
        #[Groups(['crear', 'modificar_contrasena'])]
        public ?string $contrasena = null,

        #[Assert\NotNull(message: 'usuario.habilitado.not_blank', groups: ['crear', 'editar'])]
        #[Assert\Type(type: 'bool')]
        #[Groups(['crear', 'editar'])]
        public ?bool $habilitado = null,

        #[Assert\Choice(choices: RolConstant::ROLES_USUARIO, multiple: true)]
        #[Groups(['crear', 'editar'])]
        public ?array $roles = null,
    ) {}
}
```

**Constraint messages** usan claves de traducción: `{entidad}.{campo}.{constraint}`

### 2.6 Response DTOs (Serialización)

```php
class FlotaResponse
{
    public function __construct(
        #[Groups(['listar', 'obtener'])]
        public int $id,

        #[Groups(['listar', 'obtener'])]
        public string $nombre,

        #[Groups(['listar', 'obtener'])]
        public int $capacidad_volumetrica,

        #[Groups(['listar', 'obtener'])]
        public int $cantidad_vehiculos,
    ) {}

    public static function fromEntity(Flota $flota): self
    {
        return new self(
            id: $flota->getId(),
            nombre: $flota->getNombre(),
            capacidad_volumetrica: $flota->getCapacidadVolumetrica(),
            cantidad_vehiculos: $flota->getVehiculos()->count(),
        );
    }
}
```

**Groups de serialización:**
- `listar` — Campos que se muestran en listados
- `obtener` — Campos que se muestran al obtener un item
- `autocomplete` — Campos mínimos para dropdowns/búsqueda

### 2.7 Controladores

#### Base Controller

```php
class TmsAbstractController extends AbstractController
{
    // Obtener usuario autenticado
    protected function getUsuario(): Usuario

    // Validar que el recurso pertenece a la empresa del usuario
    protected function validarAccesoEmpresa(Empresa $empresa): void

    // Respuestas estandarizadas
    protected function jsonItemResponse200(mixed $dto): JsonResponse       // group: 'obtener'
    protected function jsonListResponse200(array $data): JsonResponse      // group: 'listar'
    protected function jsonItemsResponse200(array $data): JsonResponse     // group: 'autocomplete'

    // Respuesta de eliminación con i18n
    protected function jsonDeleteResponse200(
        TranslatorInterface $translator,
        string $entityKey,
        array $entities,
        ?callable $extractor = null
    ): JsonResponse

    // Validar que se encontraron todos los recursos solicitados
    protected function validarRecursosEncontradosOThrowNotFound(
        TranslatorInterface $translator,
        string $entityKey,
        array $entities,
        array $idsRecurso,
        ?callable $extractor = null
    ): void
}
```

#### Ejemplo de Controller completo

```php
#[Route('/api/flotas', name: 'api_flota_')]
class FlotaController extends TmsAbstractController
{
    use PaginadorTrait;

    public function __construct(
        private FlotaRepository $flotaRepository,
        private FlotaService $flotaService,
        private AnalisisLogService $analisisLogService,
    ) {}

    #[Route('/', name: 'buscar', methods: ['GET'])]
    #[OpenApiGetList('Obtener lista de flotas', responseModel: FlotaResponse::class)]
    public function buscar(
        #[MapQueryParameter] ?string $nombre,
        #[MapQueryParameter] int $page = 1,
        #[MapQueryParameter] int $limit = 10,
    ): JsonResponse {
        $usuario = $this->getUsuario();
        $query = $this->flotaRepository->searchQuery($usuario, $page, $limit, $nombre);
        $respuesta = $this->paginarRepuesta($query, $page, $limit);
        return $this->jsonListResponse200($respuesta);
    }

    #[Route('/{id}', name: 'obtener', methods: ['GET'])]
    #[OpenApiGetItem('Obtener detalle de flota', responseModel: FlotaResponse::class)]
    public function obtener(Flota $flota): JsonResponse
    {
        $this->validarAccesoEmpresa($flota->getEmpresa());
        return $this->jsonItemResponse200($flota->toDto());
    }

    #[Route('/', name: 'crear', methods: ['POST'])]
    #[OpenApiPost('Crear flota', requestModel: FlotaRequest::class, responseModel: FlotaResponse::class)]
    public function crear(
        #[MapRequestPayloadWithGroup(group: 'crear')]
        FlotaRequest $flotaRequest
    ): JsonResponse {
        $usuario = $this->getUsuario();
        $flota = $this->flotaService->crear($usuario, $flotaRequest);
        $this->analisisLogService->logCreacion($usuario, __METHOD__, EntidadAnalisisLog::FLOTA, $flota->getId());
        return $this->jsonItemResponse200($flota->toDto());
    }

    #[Route('/{id}', name: 'editar', methods: ['PUT'])]
    #[OpenApiPut('Editar flota', requestModel: FlotaRequest::class, responseModel: FlotaResponse::class)]
    public function editar(
        Flota $flota,
        #[MapRequestPayloadWithGroup(group: 'editar')]
        FlotaRequest $flotaRequest
    ): JsonResponse {
        $this->validarAccesoEmpresa($flota->getEmpresa());
        $flota = $this->flotaService->editar($flota, $flotaRequest);
        $this->analisisLogService->logEdicion($this->getUsuario(), __METHOD__, EntidadAnalisisLog::FLOTA, $flota->getId());
        return $this->jsonItemResponse200($flota->toDto());
    }

    #[Route('/', name: 'eliminar', methods: ['DELETE'])]
    #[OpenApiDelete('Eliminar flotas')]
    public function eliminar(
        #[MapRequestPayloadWithGroup(group: 'eliminar')]
        FlotaRequest $flotaRequest,
        TranslatorInterface $translator
    ): JsonResponse {
        $usuario = $this->getUsuario();
        $flotas = $this->flotaRepository->findBy(['id' => $flotaRequest->ids, 'empresa' => $usuario->getEmpresa()]);
        $this->validarRecursosEncontradosOThrowNotFound($translator, 'flota', $flotas, $flotaRequest->ids);
        $this->flotaService->eliminar($flotas);
        $this->analisisLogService->logEliminacion($usuario, __METHOD__, EntidadAnalisisLog::FLOTA, $flotaRequest->ids);
        return $this->jsonDeleteResponse200($translator, 'flota', $flotas);
    }
}
```

### 2.8 Servicios

```php
class FlotaService
{
    public function __construct(
        private EntityManagerInterface $em,
    ) {}

    public function crear(Usuario $usuario, FlotaRequest $request): Flota
    {
        $flota = new Flota();
        $flota->setNombre($request->nombre);
        $flota->setEmpresa($usuario->getEmpresa());
        // ... set más campos
        $this->em->persist($flota);
        $this->em->flush();
        return $flota;
    }

    public function editar(Flota $flota, FlotaRequest $request): Flota
    {
        $flota->setNombre($request->nombre);
        // ... actualizar campos
        $this->em->flush();
        return $flota;
    }

    public function eliminar(array $flotas): void
    {
        foreach ($flotas as $flota) {
            $flota->setEliminado(true);  // Soft delete
        }
        $this->em->flush();
    }
}
```

### 2.9 Repositorios y Paginación

#### PaginadorTrait

```php
trait PaginadorTrait
{
    private function paginarRepuesta(Query $query, int $page, int $limit): array
    {
        // Retorna:
        // {
        //   items: [...toDto()],
        //   paginate: { total, pagina, paginas, ppp }
        // }
    }
}
```

#### Patrón de búsqueda en Repository

```php
public function searchQuery(Usuario $usuario, int $page, int $limit, ?string $nombre = null): Query
{
    $qb = $this->createQueryBuilder('f')
        ->where('f.eliminado = false')
        ->andWhere('f.empresa = :empresa')
        ->setParameter('empresa', $usuario->getEmpresa());

    if ($nombre !== null) {
        $qb->andWhere('LOWER(f.nombre) LIKE :nombre')
           ->setParameter('nombre', '%' . strtolower($nombre) . '%');
    }

    $qb->orderBy('f.nombre', 'ASC')
       ->setMaxResults($limit)
       ->setFirstResult(($page - 1) * $limit);

    return $qb->getQuery();
}
```

### 2.10 Event Listeners (Middleware)

| Listener | Evento | Función |
|----------|--------|---------|
| `ApiExceptionListener` | `kernel.exception` | Convierte excepciones a JSON estandarizado |
| `ApiResponseListener` | `kernel.response` | Wrappea respuestas exitosas en `{ data: ... }` |
| `AuthenticationFailureListener` | `on_authentication_failure` | Retorna 401/403 con mensaje traducido |
| `JWTSessionInjectorListener` | `on_jwt_created` | Crea sesión e inyecta `id_sesion` en JWT |
| `JWTSessionValidatorListener` | `on_jwt_decoded` | Valida sesión activa en cada request |

### 2.11 Excepciones Custom

```php
// Errores de negocio - se traducen automáticamente
throw new DomainException('usuario.no_encontrado', ['email' => $email]);
// → Traduce vía: exceptions+intl-icu.es.yaml

// Errores de validación custom
throw new ValidationException(['campo' => 'Mensaje de error']);
// → HTTP 400 con { message, errors: { campo: '...' } }
```

### 2.12 Auditoría (AnalisisLogService)

```php
// Todas las mutaciones se loguean:
$this->analisisLogService->logCreacion($usuario, __METHOD__, EntidadAnalisisLog::FLOTA, $flota->getId());
$this->analisisLogService->logEdicion($usuario, __METHOD__, EntidadAnalisisLog::FLOTA, $flota->getId());
$this->analisisLogService->logEliminacion($usuario, __METHOD__, EntidadAnalisisLog::FLOTA, $ids);
$this->analisisLogService->logExcepcion(__METHOD__, $code, $errors);

// Canal dedicado en Monolog: 'analisis'
// En prod: logea a CloudWatch
```

### 2.13 Colas Async (Messenger)

```php
// Message
final class ExportarFlotasMessage {
    public function __construct(
        public readonly string $filename,
        public readonly ExportarFlotaRequest $exportarFlotaRequest,
    ) {}
}

// Handler
#[AsMessageHandler]
final class ExportarFlotasMessageHandler {
    public function __invoke(ExportarFlotasMessage $message): void {
        // 1. Marcar estado: EN_CURSO (cache)
        // 2. Buscar datos
        // 3. Generar Excel
        // 4. Marcar estado: FINALIZADO (cache)
    }
}
```

**Tracking de estado:** Se usa `CacheService` con `JobStatus` enum (PENDIENTE → EN_CURSO → FINALIZADO).

### 2.14 Formato de Respuesta API

```json
// Listado (GET /api/flotas/)
{
  "data": {
    "items": [
      { "id": 1, "nombre": "Flota Norte", "capacidad_volumetrica": 5000 }
    ],
    "paginate": {
      "total": 25,
      "pagina": 1,
      "paginas": 3,
      "ppp": 10
    }
  }
}

// Item (GET /api/flotas/1)
{
  "data": {
    "id": 1,
    "nombre": "Flota Norte",
    "capacidad_volumetrica": 5000,
    "cantidad_vehiculos": 3
  }
}

// Error de validación (422)
{
  "code": 422,
  "message": "Error de validación",
  "errors": {
    "nombre": "El nombre es obligatorio",
    "email": "El email no es válido"
  }
}

// Error de negocio (400)
{
  "code": 400,
  "message": "El usuario no fue encontrado"
}
```

### 2.15 Traducciones

```yaml
# translations/validators+intl-icu.es.yaml
usuario.nombre.not_blank: "El nombre es obligatorio"
commons.email.not_blank: "El email es obligatorio"
commons.email.no_valido: "El email no es válido"

# translations/exceptions+intl-icu.es.yaml
usuario.no_encontrados: "{count, plural, one {Usuario} other {Usuarios}} no encontrado/s: {ref}"
flota.eliminados_correctamente: "{count, plural, one {Flota eliminada} other {{count} flotas eliminadas}} correctamente"

# translations/messages+intl-icu.es.yaml
# Mensajes generales de UI
```

### 2.16 Testing

```php
// tests/Controller/FlotaControllerTest.php
class FlotaControllerTest extends WebTestCase
{
    use ResetDatabaseTrait;  // DAMA: rollback transaccional entre tests

    // TestObjects: factory in-memory para crear objetos de test
    // PersistedTestObjects: factory que persiste en DB

    public function testCrearFlota(): void
    {
        $client = static::createClient();
        $client->loginUser($usuario);  // Simula autenticación
        $client->request('POST', '/api/flotas/', [], [], [], json_encode([
            'nombre' => 'Test Flota',
        ]));
        $this->assertResponseStatusCodeSame(200);
    }
}
```

### 2.17 MapRequestPayloadWithGroup (Attribute Custom)

```php
#[Attribute(Attribute::TARGET_PARAMETER)]
class MapRequestPayloadWithGroup extends MapRequestPayload
{
    public function __construct(string $group) {
        parent::__construct(
            serializationContext: ['groups' => [$group]],
            validationGroups: [$group]
        );
    }
}

// Uso en controllers:
public function crear(
    #[MapRequestPayloadWithGroup(group: 'crear')]
    FlotaRequest $flotaRequest
): Response
```

---

## 3. Frontend (APP)

### 3.1 Stack Tecnológico

```
React 18 + TypeScript
Vite (build tool, envPrefix: 'TMS_')
pnpm (gestor de paquetes)
Panda CSS + @enviopack/epic-ui (librería UI propia)
```

**Dependencias clave:**
- `react-router-dom` — Ruteo
- `@reduxjs/toolkit` + `react-redux` — State management (auth + profile)
- `@tanstack/react-query` — Server state (datos del API)
- `axios` — HTTP client con interceptors
- `formik` + `yup` — Forms + validación
- `react-i18next` — Internacionalización
- `react-toastify` — Notificaciones toast

### 3.2 Estructura de Directorios

```
app/
├── src/
│   ├── app/
│   │   ├── App.tsx                    # Root con providers
│   │   ├── AppTMS.tsx                 # Rutas privadas
│   │   └── AppRoutes.tsx              # Router principal
│   ├── adapters/                      # Transformación API ↔ Forms
│   │   └── vehiculo.adapter.ts
│   ├── components/                    # Componentes reutilizables
│   │   ├── AuthBoot/                  # Hidratación de auth al inicio
│   │   ├── PrivateRoute/             # Guard de rutas privadas
│   │   ├── PermissionGuard/          # Guard por roles
│   │   ├── DataTableWithActionBar/   # Tabla con selección múltiple + action bar
│   │   ├── FilterBar/               # Filtros dinámicos con draft state
│   │   ├── Sidenav/                  # Barra lateral de navegación
│   │   └── RoutesWithNotFound/       # Wrapper con 404
│   ├── domain/
│   │   ├── constants/                # Constantes (rutas, roles, regex)
│   │   └── models/                   # Tipos TypeScript (User, Vehiculo, Error, etc.)
│   ├── hooks/                        # Hooks compartidos
│   │   ├── useQueryParams.ts         # Sync query params ↔ URL
│   │   ├── useLogout.ts              # Lógica de logout
│   │   └── useExportar.ts            # Exportación async (init → poll → download)
│   ├── infrastructure/
│   │   ├── interceptors/
│   │   │   └── api.interceptor.ts    # Axios instance + token injection + refresh
│   │   └── langs/
│   │       └── es_AR.json            # Traducciones
│   ├── layouts/
│   │   ├── App/App.layout.tsx        # Layout principal (Sidenav + Outlet)
│   │   ├── Public/Public.layout.tsx  # Layout login (branding + form)
│   │   ├── Config/Config.layout.tsx  # Layout con PermissionGuard
│   │   └── HeaderListado/           # Header de páginas de listado
│   ├── pages/
│   │   ├── Login/                    # Página de login
│   │   ├── RecuperarPassword/        # Recuperación de contraseña
│   │   └── Configuracion/
│   │       ├── Usuarios/
│   │       ├── Vehiculos/            # CRUD completo (listado + crear + editar)
│   │       ├── Flotas/
│   │       ├── Empleadores/
│   │       ├── Direcciones/
│   │       └── Modelos/
│   ├── providers/
│   │   └── SessionProvider.tsx       # Carga perfil del usuario tras login
│   ├── services/                     # Capa de servicios API
│   │   ├── auth.service.ts
│   │   ├── usuario.service.ts
│   │   ├── vehiculos.service.ts
│   │   └── ...
│   ├── shared/
│   │   └── utilities/
│   │       ├── auth.utility.ts       # Token lifecycle (refresh, decode, storage)
│   │       └── storage.utility.ts    # localStorage/sessionStorage helpers
│   ├── store/
│   │   ├── slices/auth.slice.ts      # Redux: auth state
│   │   ├── slices/profile.slice.ts   # Redux: user profile
│   │   ├── thunks/auth.thunk.ts      # Thunks: login, hydrate
│   │   └── store.ts                  # Configuración del store
│   └── styles/
│       └── global.style.ts           # Estilos globales + Panda CSS config
├── panda.config.ts                   # Configuración Panda CSS
├── vite.config.ts                    # Configuración Vite
├── tsconfig.json
└── package.json
```

### 3.3 Providers (Bootstrap Order)

```tsx
// App.tsx
<ToastContainer />
<Provider store={store}>              {/* 1. Redux (auth + profile) */}
  <QueryClientProvider client={qc}>   {/* 2. React Query (server state) */}
    <ModalProvider>                    {/* 3. Modal global */}
      <AuthBoot>                      {/* 4. Hidratación de auth */}
        <AppRoutes />                 {/* 5. Router */}
      </AuthBoot>
    </ModalProvider>
  </QueryClientProvider>
</Provider>
```

### 3.4 Autenticación Frontend

#### AuthBoot

```tsx
// Se ejecuta al iniciar la app
const AuthBoot = ({ children }) => {
    const dispatch = useDispatch();
    const { hydrated } = useSelector((s) => s.auth);
    
    useEffect(() => {
        dispatch(hydrateAuthThunk());  // Intenta restaurar sesión
    }, []);
    
    if (!hydrated) return <LoadingLayout />;
    return <>{children}</>;
};
```

#### Token Management

```typescript
// auth.utility.ts
const SKEW_SECONDS = 30;  // Buffer de 30 seg antes de expiración

// getAccessToken() — Retorna token válido o hace refresh automático
// Usa global promise lock para evitar refresh concurrentes
export const getAccessToken = async (): Promise<string | null> => {
    const current = getTokenRaw();
    if (isAccessValid(current)) return current;
    
    const refreshToken = getRefreshTokenRaw();
    if (!refreshToken) return null;
    
    if (!refreshPromise) {
        refreshPromise = (async () => {
            const data = await reqRefreshToken(refreshToken);
            saveTokensInStorage(data.data, getStorage());
            return data.data.token;
        })();
    }
    return await refreshPromise;
};
```

#### Storage según "Recordar"

```typescript
// Si "recordar" (checkbox) = true → localStorage (persiste)
// Si "recordar" = false → sessionStorage (se pierde al cerrar)
// Al hacer login, se limpia el storage opuesto
```

#### Interceptor Axios

```typescript
// Request: inyecta Bearer token (auto-refresh si expirado)
api.interceptors.request.use(async (config) => {
    if (isUrlExcluded(config.url)) return config;
    const token = await getAccessToken();
    if (token) setAuthHeader(config, token);
    return config;
});

// Response: en 401/403, intenta refresh y retry; si falla, logout
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if ([401, 403].includes(error.response?.status) && !originalRequest._retry) {
            originalRequest._retry = true;
            const newToken = await getAccessToken();
            if (newToken) return api(originalRequest);  // Retry
            clearAllStorage();
            window.location.href = '/login';  // Force logout
        }
        return Promise.reject(new ErrorResponse(error));
    }
);
```

#### PrivateRoute

```tsx
const PrivateRoute = () => {
    const { data, hydrated } = useSelector((s) => s.auth);
    if (!hydrated) return <LoadingLayout />;
    return data.isAuthenticated ? <Outlet /> : <Navigate to="/login" />;
};
```

#### PermissionGuard (por roles)

```tsx
export default function PermissionGuard({ children, requiredRoles = [] }) {
    const user = useSelector((state) => state.profile);
    const hasAccess = !requiredRoles.length || 
                      user?.roles?.some((r) => requiredRoles.includes(r));
    if (!hasAccess) return <LockedContentUI />;
    return <>{children}</>;
}
```

### 3.5 Patrón CRUD Completo (Ejemplo: Vehículos)

#### Estructura de archivos

```
pages/Configuracion/Vehiculos/
├── Vehiculos.page.tsx               # Página principal con tabs
├── AltaVehiculo.page.tsx            # Formulario crear/editar
├── vehiculos/
│   ├── vehiculos.columns.tsx        # Definición de columnas de tabla
│   ├── vehiculos.actions.tsx        # Acciones de fila y bulk
│   ├── hooks/
│   │   ├── useVehiculos.ts          # Hook orquestador principal
│   │   ├── useVehiculosList.ts      # React Query hooks (fetch)
│   │   ├── useQuery.tsx             # URL query params
│   │   ├── useAltaVehiculo.ts       # Carga de datos para form
│   │   ├── useDeleteVehiculo.tsx    # Acción de eliminar
│   │   └── useCambiarCondicionVehiculo.tsx
│   └── components/
│       └── AltaVehiculoForm/
│           ├── AltaVehiculoForm.component.tsx
│           └── vehiculo.schema.ts   # Yup schema + initial values
```

#### Hook orquestador (useVehiculos)

```typescript
export const useVehiculos = () => {
    const { query, update } = useQuery();                     // 1. URL params
    const { items, paginate, isFetching } = useVehiculosList(query);  // 2. Fetch data
    const columns = useMemo(() => getColumns(t), [t]);        // 3. Columnas
    const actions = useMemo(() => getActions({...handlers}), []);  // 4. Acciones
    const exportHook = useExportar({...exportConfig});        // 5. Exportación
    
    return { actions, columns, items, paginate, isLoading: isFetching, update };
};
```

#### Data fetching (React Query)

```typescript
export const useVehiculosList = (search: VehiculoFilters) => {
    const { data, isFetching } = useQuery({
        queryFn: () => getVehiculos(search),
        queryKey: [queryKeys.vehiculos, search],
    });
    return { items: data?.items ?? [], paginate: data?.paginate, isFetching };
};
```

#### Service layer

```typescript
export const getVehiculos = async (params: VehiculoFilters) => {
    const { data } = await api.get<ApiResponseList<Vehiculo>>('/vehiculos/', { params });
    return { items: data.data.items, paginate: adaptPagination(data) };
};

export const createVehiculo = async (formData: VehiculoForm) => {
    const { data } = await api.post<ApiResponse>('/vehiculos/', formData);
    return data;
};

export const editVehiculo = async (id: string, formData: VehiculoForm) => {
    const { data } = await api.put<ApiResponse>(`/vehiculos/${id}`, formData);
    return data;
};

export const deleteVehiculo = async (vehiculos: Vehiculo[]) => {
    const { data } = await api.delete<ApiResponse>('/vehiculos/', {
        data: adaptEditVehiculoToApi(vehiculos),
    });
    return data;
};
```

#### Adapter (transformación API ↔ Form)

```typescript
// API → Form (para edición)
export const adaptVehiculo = (external: Vehiculo): VehiculoForm => {
    const { conductores, flotas, empleador, vehiculo_tipo, ...shared } = external;
    return {
        ...shared,
        id_empleador: empleador?.id ?? null,
        id_vehiculo_tipo: vehiculo_tipo?.id ?? null,
        ids_conductores: conductores.map((c) => c.id),
        ids_flotas: flotas.map((f) => f.id),
    };
};

// Form → API (para envío)
export const adaptCreateVehiculoToApi = (form: VehiculoForm) => ({
    ...form,
    vencimiento_seguro: convertMonthYearToISO(form.vencimiento_seguro),
});
```

#### Form page (Formik + Yup)

```tsx
const AltaVehiculo = ({ tPrefix }: { tPrefix: 'crear' | 'editar' }) => {
    const { id } = useParams();
    const { data: vehiculo } = useVehiculo(id);           // Fetch si editar
    const { tiposDeVehiculo, flotas } = useAltaVehiculo(); // Opciones

    const { mutate, isPending } = useMutation({
        mutationFn: async (formData) => {
            if (id) return editVehiculo(id, adaptCreateVehiculoToApi(formData));
            return createVehiculo(adaptCreateVehiculoToApi(formData));
        },
        onSuccess: () => navigate(-1),
    });

    const initialValues = vehiculo ? adaptVehiculo(vehiculo) : defaultValues;

    return (
        <Formik initialValues={initialValues} onSubmit={mutate} validationSchema={schema(t)}>
            {(formik) => <Form>{/* campos */}</Form>}
        </Formik>
    );
};
```

#### Yup Schema

```typescript
export const formSchema = (t: TFunction) =>
    Yup.object().shape({
        codigo: Yup.string()
            .required(t('form.fields.codigo.error.required'))
            .min(5, t('form.fields.codigo.error.minLength'))
            .max(7, t('form.fields.codigo.error.maxLength')),
        capacidad_volumetrica: Yup.number()
            .required(t('form.fields.capacidadVolumetrica.error.required'))
            .positive(t('form.fields.capacidadVolumetrica.error.positive')),
    });
```

### 3.6 Ruteo

```tsx
<BrowserRouter>
  {/* Rutas públicas */}
  <Route element={<PublicLayout />}>
    <Route path="login" element={<Login />} />
    <Route path="recuperar-contrasena" element={<RecuperarPassword />} />
  </Route>

  {/* Rutas privadas */}
  <Route element={<PrivateRoute />}>
    <Route element={<SessionProvider><AppLayout /></SessionProvider>} path="configuracion">
      {/* Con PermissionGuard por roles */}
      <Route element={<ConfigLayout roles={[ENVIOPACK_ADMIN, OWNER]} />}>
        <Route element={<Usuarios />} path="usuarios" />
      </Route>
      <Route element={<ConfigLayout roles={[ENVIOPACK_ADMIN, OWNER, ADMINISTRADOR]} />}>
        <Route element={<Vehiculos />} path="vehiculos" index />
        <Route element={<AltaVehiculo tPrefix="crear" />} path="vehiculos/crear" />
        <Route element={<AltaVehiculo tPrefix="editar" />} path="vehiculos/:id" />
      </Route>
    </Route>
  </Route>
</BrowserRouter>
```

### 3.7 Layouts

**AppLayout:** Sidenav (izquierda) + Content area (derecha con `<Outlet />`)

**PublicLayout:** Imagen de branding (izquierda) + Formulario (derecha)

**ConfigLayout:** Wrapper con `PermissionGuard` que recibe `roles[]`

**HeaderListado:** Breadcrumb + Actions (botones) + Filters + Pagination

### 3.8 UI Components Clave

| Componente | Descripción |
|-----------|-------------|
| `DataTableWithActionBar` | Tabla con selección múltiple + action bar flotante |
| `FilterBar` | Filtros dinámicos con estado draft (autocomplete, select, multiselect) |
| `HeaderListado` | Header estándar de páginas de listado |
| `Sidenav` | Navegación lateral con secciones, items, y footer con perfil |
| `PermissionGuard` | Guard de UI por roles |
| `ModalProvider` | Modales globales via `useModal()` |

### 3.9 Internacionalización (i18n)

```json
{
  "pages": {
    "vehiculos": {
      "title": "Vehículos",
      "vehiculos": {
        "table": {
          "columns": {
            "codigo": { "title": "Código" }
          },
          "empty": {
            "title": "No hay vehículos",
            "message": "Crea un vehículo para comenzar"
          }
        },
        "actions": {
          "crear": { "title": "Crear vehículo" },
          "eliminar": { "title": "Eliminar", "tooltip": "Eliminar seleccionados" }
        }
      },
      "crear": {
        "form": {
          "fields": {
            "codigo": {
              "title": "Código",
              "error": { "required": "El código es obligatorio" }
            }
          }
        }
      }
    }
  }
}
```

**Estructura de claves:** `{sección}.{página}.{contexto}.{campo}.{tipo}` (ej: `pages.vehiculos.crear.form.fields.codigo.error.required`)

### 3.10 Exportación Async

```typescript
const exportHook = useExportar({
    init: '/exportar/vehiculos',     // POST: inicia export
    status: '/exportar/estado',       // GET: poll estado
    download: '/exportar/descargar',  // GET: descarga blob
    key: 'vehiculos',
    filename: 'vehiculos.xlsx',
});

// Flujo: INIT → POLL (cada N seg hasta FINALIZADO) → DOWNLOAD blob → FileDownload
```

### 3.11 Variables de Entorno

```
TMS_API_URL=https://api.tms.enviopack.com  # URL del backend
TMS_PAIS=ar                                # País (ar, mx)
TMS_APP_VERSION=1.0.0                       # Versión de la app
```

Prefijo `TMS_` (configurado en `vite.config.ts` con `envPrefix: 'TMS_'`).

### 3.12 Build & Deploy

```json
{
  "scripts": {
    "static-gen": "panda codegen",
    "build": "pnpm run static-gen && vite build",
    "dev": "pnpm run static-gen && TMS_PAIS=ar vite dev",
    "lint": "eslint .",
    "test": "vitest --watch"
  }
}
```

- Dev server en puerto 3000
- Alias `@` → `./src`, `styled-system` → `./styled-system`
- SVGs se importan como componentes React (via SVGR)

---

## 4. Mobile

### 4.1 Stack Tecnológico

```
Expo SDK 54 + React Native 0.81.5
React 19.1 + TypeScript 5.9
pnpm (gestor de paquetes)
EAS (build & deploy)
```

**Dependencias clave:**
- `@reduxjs/toolkit` + `redux-persist` — State management con persistencia
- `@react-navigation/native-stack` + `drawer` — Navegación
- `formik` + `yup` — Forms + validación
- `axios` — HTTP client (mismos interceptors que web)
- `react-i18next` — i18n
- `expo-secure-store` — Tokens en storage seguro
- `@react-native-async-storage/async-storage` — Storage general
- `expo-sqlite` — Base de datos offline
- `expo-location` + `expo-task-manager` — Tracking GPS en background
- `@react-native-community/netinfo` — Monitoreo de conectividad
- `expo-camera` — Scanner de códigos de barra
- `react-native-signature-canvas` — Firma digital
- `react-native-paper` — Componentes UI base

### 4.2 Estructura de Directorios

```
mobile/
├── App.tsx                            # Root (providers + navigation)
├── index.ts                           # Entry point (registra app + background task)
├── app.config.ts                      # Config Expo (permisos, plugins, branding)
├── eas.json                           # Build profiles (qa-1/2/3/4, prod-ar/mx)
├── src/
│   ├── app/
│   │   ├── store.ts                   # Redux store + RTK Query + persist
│   │   └── i18n.ts                    # Config i18next (es-AR)
│   ├── domain/
│   │   ├── models/                    # Tipos (auth, route, paquete, direccion, etc.)
│   │   └── constants/                 # HTTP codes, rutas excluidas, estados
│   ├── infrastructure/
│   │   ├── interceptors/
│   │   │   ├── api.interceptor.ts     # Axios + auth + refresh (User-Agent: tms-mobile)
│   │   │   └── apiQuery.interceptor.ts # RTK Query base query
│   │   ├── offline/
│   │   │   ├── database/
│   │   │   │   ├── database.ts        # SQLite setup + migraciones
│   │   │   │   ├── cola.repository.ts # Cola de operaciones pendientes
│   │   │   │   └── *.repository.ts    # Repos offline por dominio
│   │   │   └── network/
│   │   │       └── network.monitor.ts # NetInfo listener
│   │   └── langs/es_AR.json
│   ├── navigation/
│   │   ├── MainStack.tsx              # Stack Navigator (todas las screens)
│   │   ├── routes.ts                  # Constantes de rutas
│   │   └── RootNavigation.ts          # Ref para navegación imperativa
│   ├── screens/                       # Screens (una carpeta por feature)
│   │   ├── Login/
│   │   │   ├── Login.screen.tsx
│   │   │   ├── Login.styles.ts
│   │   │   └── components/LoginForm/
│   │   ├── Home/                      # Drawer Navigator
│   │   ├── Rutas/                     # Lista de rutas (tabs activas/historial)
│   │   ├── ListaDirecciones/
│   │   ├── Direccion/
│   │   ├── EscanearPaquetes/          # Scanner código barras
│   │   ├── FirmaDigital/              # Captura de firma
│   │   ├── Camara/                    # Captura de fotos
│   │   ├── CierreDireccion/           # Cierre de visita (comprobantes)
│   │   ├── VisitaFallida/             # Flujo de visita fallida
│   │   └── ValidacionFinal/
│   ├── components/                    # Componentes reutilizables
│   │   ├── Button/
│   │   ├── Text/
│   │   ├── Icon/
│   │   ├── ScreenHeader/
│   │   ├── Tabs/
│   │   ├── Card/
│   │   ├── Badge/
│   │   ├── AuthBoot/                  # Hidratación auth
│   │   ├── OfflineBanner/             # Banner online/offline
│   │   ├── Toast/
│   │   ├── LoadingScreen/
│   │   ├── ModalAdvertencia/
│   │   └── Drawer/
│   ├── styles/                        # Design tokens
│   │   ├── colors.ts
│   │   ├── typography.ts
│   │   ├── spacing.ts
│   │   ├── borderRadius.ts
│   │   └── shadows.ts
│   ├── store/
│   │   ├── slices/
│   │   │   ├── auth.slice.ts          # Persistido (AsyncStorage)
│   │   │   ├── sync.slice.ts          # Estado de sincronización offline
│   │   │   ├── route.slice.ts
│   │   │   ├── listaDirecciones.slice.ts
│   │   │   └── cierreDireccion.slice.ts
│   │   ├── thunks/auth.thunk.ts
│   │   └── hooks/useAppDispatch.ts
│   ├── services/
│   │   ├── auth/
│   │   │   ├── auth.service.ts        # Axios-based
│   │   │   └── authQuery.service.ts   # RTK Query endpoints
│   │   ├── rutas/
│   │   ├── direcciones/
│   │   ├── trackings/
│   │   └── offline/
│   │       ├── sync.service.ts        # Orquestación de sincronización
│   │       ├── seguimiento.service.ts # Tracking GPS background
│   │       └── limpieza.service.ts    # Limpieza de datos viejos
│   └── shared/
│       ├── utilities/
│       │   ├── token.manager.ts       # SecureStore + JWT decode
│       │   ├── storage.utility.ts     # AsyncStorage wrapper
│       │   ├── auth.utility.ts
│       │   ├── offline.utility.ts     # tryOrQueue: ejecuta o encola
│       │   └── formatters.utility.ts
│       └── hooks/
│           ├── useNetwork.ts
│           └── useAsyncData.ts
├── assets/
│   ├── fonts/icomoon/                 # Iconos custom
│   ├── icon.png, splash.png
│   └── adaptive-icon.png
├── babel.config.js                    # Module aliases
├── tsconfig.json
├── jest.config.js
├── .eslintrc.js
├── .prettierrc
├── commitlint.config.cjs             # Conventional commits
└── .husky/pre-commit                  # lint-staged
```

### 4.3 Navegación

```
MainStack (NativeStackNavigator)
├── Login
└── Home (DrawerNavigator)
    └── Rutas
        ├── ListaDirecciones
        ├── Direccion
        ├── DetalleDireccion
        ├── EscanearPaquetes
        ├── CierreDireccion
        ├── FirmaDigital
        ├── Camara
        ├── VisitaFallida
        ├── ValidacionFinal
        ├── DetallePaquetes
        └── QuitarEnvioMotivo
```

**Navegación imperativa** (para logout global):
```typescript
// RootNavigation.ts
export const navigationRef = React.createRef<NavigationContainerRef>();
export const resetToLogin = () => {
    navigationRef.current?.reset({ index: 0, routes: [{ name: ROUTE_LOGIN }] });
};
```

### 4.4 Autenticación Mobile

Misma lógica que web pero con **SecureStore** en lugar de localStorage:

```typescript
// token.manager.ts
import * as SecureStore from 'expo-secure-store';

export const saveTokens = async (token: string, refreshToken: string) => {
    await SecureStore.setItemAsync('accessToken', token);
    await SecureStore.setItemAsync('refreshToken', refreshToken);
};

export const getToken = async () => SecureStore.getItemAsync('accessToken');
export const getRefreshToken = async () => SecureStore.getItemAsync('refreshToken');
```

**Interceptor Axios** idéntico al web pero con:
- Header `User-Agent: tms-mobile`
- Callback `onUnauthorized` que llama a `logoutThunk()` + `resetToLogin()`

### 4.5 Offline Support

#### Arquitectura Offline-First

```
1. tryOrQueue(apiCall)
   ├── Si online → ejecuta API call normalmente
   └── Si offline → encola en SQLite (cola.repository)

2. Network Monitor (NetInfo)
   └── Cuando vuelve online → dispara sincronización

3. Sync Service
   ├── Lee operaciones pendientes de cola SQLite
   ├── Ejecuta cada operación contra el API
   └── Elimina de cola al completar
```

#### SQLite Database

```typescript
// database.ts
// - Inicialización con migraciones versionadas
// - Repos por dominio: cola, direcciones, rutas, paquetes, comprobantes
// - Schema evoluciona via migrations array
```

#### Sync Slice (Redux)

```typescript
interface SyncState {
    isOnline: boolean;
    operacionesPendientes: number;
    sincronizando: boolean;
    ultimoError: string | null;
}
```

### 4.6 State Management Mobile

```typescript
// store.ts
const store = configureStore({
    reducer: {
        auth: persistReducer(authPersistConfig, authReducer),  // Persistido
        sync: syncReducer,
        route: routeReducer,
        listaDirecciones: listaDireccionesReducer,
        cierreDireccion: cierreDireccionReducer,
        [baseApi.reducerPath]: baseApi.reducer,  // RTK Query cache
    },
    middleware: (getDefault) =>
        getDefault({ serializableCheck: false }).concat(baseApi.middleware),
});
```

**RTK Query** con `axiosBaseQuery` que reutiliza el interceptor de Axios.

### 4.7 Componentes UI Mobile

Mismo sistema de design tokens que web:

```typescript
// styles/colors.ts — Paleta de colores (brand, feedback, neutral)
// styles/typography.ts — Tamaños de fuente (xs, sm, md, lg, xl)
// styles/spacing.ts — Escala de espaciado
// styles/borderRadius.ts — Border radius
// styles/shadows.ts — Sombras/elevación
```

**Componentes:**
- `Button` — Variantes: solid/outlined/link, colores: blue/red/gray
- `ScreenHeader` — Header con título, back/drawer toggle, acciones
- `Tabs` — Tabs para filtrar (activas/historial)
- `Card`, `Badge`, `ProgressBar`
- `ModalAdvertencia` — Diálogos de confirmación
- `OfflineBanner` — Indicador online/offline
- `Toast` — Notificaciones

### 4.8 Build Profiles (EAS)

```json
// eas.json
{
  "build": {
    "qa-1": { "env": { "EXPO_PUBLIC_API_URL": "https://qa1-api.tms.enviopack.com" } },
    "qa-2": { "env": { "EXPO_PUBLIC_API_URL": "https://qa2-api.tms.enviopack.com" } },
    "prod-ar": { "env": { "EXPO_PUBLIC_API_URL": "https://api.tms.enviopack.com" } },
    "prod-mx": { "env": { "EXPO_PUBLIC_API_URL": "https://mx-api.tms.enviopack.com" } }
  }
}
```

Variables con prefijo `EXPO_PUBLIC_` son accesibles en runtime.

---

## 5. Patrones Transversales

### 5.1 Autenticación (compartido entre web y mobile)

```
LOGIN:
  POST /api/login { email, contrasena }
  → { token: "JWT...", refresh_token: "..." }
  → Se guarda en storage (localStorage/sessionStorage en web, SecureStore en mobile)

REFRESH:
  POST /api/token/refresh { refresh_token: "..." }
  → { token: "nuevo JWT...", refresh_token: "nuevo..." }

CADA REQUEST:
  Header: Authorization: Bearer <token>
  → Si 401/403: intenta refresh → si falla: logout

LOGOUT:
  Limpia storage + estado Redux + redirige a /login
```

### 5.2 Formato de Response API

```
// Wrapper automático (ApiResponseListener):
Respuesta exitosa → { data: <contenido> }

// Listados paginados:
{ data: { items: [...], paginate: { total, pagina, paginas, ppp } } }

// Error:
{ code: 400|401|403|404|422, message: "...", errors?: { campo: "..." } }
```

### 5.3 Multi-tenancy

- Cada entidad tiene relación con `Empresa`
- Cada query filtra por `empresa` del usuario autenticado
- `validarAccesoEmpresa()` en cada endpoint que accede a un recurso por ID
- Los usuarios solo ven datos de su empresa

### 5.4 Soft Delete

- Campo `eliminado` (boolean) en cada entidad
- DELETE no borra, hace `setEliminado(true)`
- Todos los queries filtran `WHERE eliminado = false`

### 5.5 Internacionalización

- Todo en español (es_AR)
- Backend: archivos YAML en `translations/` (validators, exceptions, messages)
- Frontend web: JSON en `infrastructure/langs/es_AR.json`
- Mobile: JSON en `infrastructure/langs/es_AR.json`
- Mensajes de error del API se traducen server-side

### 5.6 Auditoría

Todas las operaciones CRUD se loguean con:
- Usuario que realizó la acción
- Método de origen (`__METHOD__`)
- Entidad afectada
- IDs involucrados
- Acción (crear/editar/eliminar/habilitar/deshabilitar)

---

## 6. Convenciones de Código

### 6.1 Backend (PHP)

- **Naming:** snake_case en español para propiedades de entidad y campos de API
- **DTOs:** Request DTOs con groups de validación; Response DTOs con groups de serialización
- **Servicios:** Un servicio por entidad/dominio, inyectado via constructor
- **Controladores:** Heredan de `TmsAbstractController`, usan `OpenApi*` attributes
- **Repositorios:** Un repositorio por entidad, usan `PaginadorTrait`
- **Excepciones:** `DomainException` para errores de negocio, `ValidationException` para validación custom
- **Traducciones:** Clave = `{entidad}.{campo}.{constraint}` o `{entidad}.{error}`
- **Tests:** PHPUnit + WebTestCase + ResetDatabaseTrait

### 6.2 Frontend (TypeScript/React)

- **Archivos:** PascalCase para componentes (`.component.tsx`), camelCase para hooks (`useVehiculos.ts`)
- **Carpetas por feature:** Cada página tiene su carpeta con hooks/, components/, columns, actions
- **Hook orquestador:** Un hook principal por página que compone data + columns + actions
- **React Query:** Para server state; Redux solo para auth + profile
- **Formik + Yup:** Para todos los formularios
- **Adapters:** Transformación API ↔ Form en archivos separados
- **Services:** Un archivo por dominio con funciones async que usan el interceptor axios
- **i18n:** Claves anidadas con `.title`, `.error.required`, etc.
- **Estilos:** Panda CSS con preset de Epic UI; no CSS manual

### 6.3 Mobile (TypeScript/React Native)

- **Misma estructura que web** pero con React Native components
- **Redux Toolkit + RTK Query** (en web se usa React Query + Redux)
- **SecureStore** para tokens (no localStorage)
- **SQLite** para offline persistence
- **StyleSheet.create()** por componente (no Panda CSS)
- **Design tokens** en `styles/` (colors, typography, spacing)
- **Expo** para acceso nativo (cámara, ubicación, storage seguro)

### 6.4 Naming General

| Concepto | Convención |
|----------|-----------|
| Entidades | Singular, PascalCase (`Vehiculo`, `Flota`) |
| Propiedades | snake_case en español (`nombre`, `capacidad_volumetrica`) |
| Endpoints | Plural, snake_case (`/api/vehiculos/`, `/api/flotas/`) |
| Componentes React | PascalCase + sufijo (`Login.page.tsx`, `Button.component.tsx`) |
| Hooks | `use` + PascalCase (`useVehiculos`, `useQuery`) |
| Servicios | Dominio + `.service.ts` (`vehiculos.service.ts`) |
| Constantes | UPPER_SNAKE_CASE (`ROLE_CONDUCTOR`, `USER_STATUS`) |
| Slices Redux | Dominio + `.slice.ts` (`auth.slice.ts`) |
| Thunks | Dominio + `.thunk.ts` (`auth.thunk.ts`) |

---

## Checklist para Nuevo Proyecto

Al crear un nuevo proyecto con esta misma arquitectura:

### Backend
- [ ] Symfony 7.2 + PHP 8.2 + PostgreSQL
- [ ] Doctrine ORM con Attributes
- [ ] JWT auth (lexik) + Refresh tokens (gesdinet)
- [ ] Security: firewalls (login, api-publica, api), roles, UserChecker, session tracking
- [ ] TmsAbstractController base con helpers
- [ ] Request DTOs con groups de validación + Response DTOs con groups de serialización
- [ ] MapRequestPayloadWithGroup attribute
- [ ] PaginadorTrait para listados
- [ ] ApiExceptionListener + ApiResponseListener (response wrapper)
- [ ] DomainException + ValidationException
- [ ] AnalisisLogService para auditoría
- [ ] Traducciones en YAML (validators, exceptions, messages)
- [ ] Messenger para tareas async (exports)
- [ ] Soft deletes + multi-tenancy por empresa
- [ ] NelmIO API Doc para documentación OpenAPI
- [ ] PHPUnit + DAMA DoctrineTestBundle

### Frontend Web
- [ ] React + TypeScript + Vite + Panda CSS
- [ ] Redux (auth + profile) + React Query (server state)
- [ ] Axios interceptor con auto-refresh JWT
- [ ] AuthBoot → PrivateRoute → SessionProvider → AppLayout
- [ ] PermissionGuard por roles
- [ ] Patrón CRUD: page → hook orquestador → columns + actions + query hook
- [ ] Formik + Yup para forms
- [ ] Adapters para transformación API ↔ Form
- [ ] i18n con react-i18next
- [ ] DataTableWithActionBar + FilterBar + HeaderListado
- [ ] useExportar para exports async
- [ ] useQueryParams para sync filtros ↔ URL

### Mobile
- [ ] Expo + React Native + TypeScript
- [ ] Redux Toolkit + RTK Query + redux-persist
- [ ] React Navigation (native-stack + drawer)
- [ ] Axios interceptor (mismo patrón que web) con User-Agent: mobile
- [ ] SecureStore para tokens
- [ ] AuthBoot + hidratación
- [ ] SQLite para offline + cola de sync
- [ ] NetInfo para monitoreo de conectividad
- [ ] Design tokens (colors, typography, spacing)
- [ ] Formik + Yup para forms
- [ ] EAS build profiles por ambiente
- [ ] Commitlint + Husky + lint-staged

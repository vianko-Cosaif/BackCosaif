# Documentación del Sistema Backend (Cosaif)

Este documento describe la arquitectura, modelos y controladores principales del sistema backend. El sistema está construido con **Node.js, Express y Prisma (PostgreSQL)**.

## 1. Visión General de la Base de Datos (Prisma)

El esquema de base de datos (`prisma/schema.prisma`) define las siguientes relaciones clave:

*   **Estructura Organizacional**:
    *   `Empresa`: Entidad raíz (ej. cliente ferroviario).
    *   `Localidad`: Ubicación física (patio, estación) perteneciente a una empresa.
    *   `Usuario`: Actores del sistema (Administrador, Coordinador, Operador, Maquinista, etc.) asignados a una Empresa y Localidad.

*   **Infraestructura de Vías**:
    *   `Via`: Rieles físicos. Pueden ser "Simples" (ocupación total) o "Seccionadas" (subdivididas).
    *   `SeccionVia`: Segmentos lógicos de una vía para ocupación parcial.

*   **Operativa**:
    *   `Movimiento`: La unidad central de trabajo. Representa el traslado de una locomotora.
    *   `Ronda`: Cola de movimientos ordenda por prioridad y lógica FIFO/Inteligente.
    *   `ServicioCola`: Servicios especiales (Lavado, Torno) que se encolan diferente.

*   **Incidentes**:
    *   `Incidente`: Reportes de problemas asociados a un movimiento o generales.
    *   Estados: `ABIERTO`, `RESUELTO`, `CERRADO`.

---

## 2. módulos Principales

### 2.1 Usuarios y Autenticación (`Usuario`)

Gestión de acceso y perfiles.

**Modelo (`src/models/Usuario/usuarioModel.ts`):**
*   **Autenticación**: Usa `argon2` para hashing de contraseñas.
*   **Login (`obtenerUsuarioPorCredenciales`)**: Verifica credenciales y devuelve el usuario con su rol.
*   **Tokens**: Gestión de JWT y `refresh_token` (aunque la lógica de tokenización está en `middlewares/token.service`).
*   **Notificaciones**: Registro de `fcmToken` (Firebase Cloud Messaging) para push notifications.

**Controlador (`src/Rutas/Usuario/UsuarioController.ts`):**
| HTTP | Endpoint | Descripción |
| :--- | :--- | :--- |
| `POST` | `/usuarios/login` | Inicia sesión. Devuelve JWT y datos del usuario. Headers opcionales: `x-device-id`, `x-platform`. |
| `GET` | `/usuarios` | Lista todos los usuarios (requiere autenticación). |
| `POST` | `/usuarios` | Crea un nuevo usuario. Rol, Empresa y Localidad son obligatorios. |
| `PUT` | `/usuarios/:id` | Edita nombre, email o contraseña. |

---

### 2.2 Gestión de Movimientos (`Movimiento`)

El núcleo operativo del sistema. Controla el flujo de trabajo de las locomotoras.

**Modelo (`src/models/Movimientos/movimientosModel.ts`):**
*   **Máquina de Estados**:
    *   `SOLICITADO`: Creado, en cola de espera.
    *   `EN_PROCESO`: En ejecución (maquinista asignado).
    *   `DETENIDO`: Pausado por alguna razón.
    *   `CONCLUIDO`: Finalizado exitosamente.
    *   `CANCELADO`: Abortado (elimina la ronda asociada).
*   **Metadatos (META)**: Las instrucciones del movimiento parsean etiquetas especiales como `[META DESTINO:123|SECCION:2|LIBERAR]` para indicar acciones automáticas al finalizar (ocupar destino, liberar origen).
*   **Prioridad**: `ALTA` o `BAJA`. Cambiar a ALTA puede reorganizar la cola (`RondaModel`).
*   **Servicios**: Lavado y Torno son movimientos especiales (`lavado: true`, `torno: true`) que se gestionan en colas paralelas.

**Controlador (`src/Rutas/Movimientos/MovimientoController.ts`):**
| HTTP | Endpoint | Descripción |
| :--- | :--- | :--- |
| `GET` | `/movimientos` | Listado general. |
| `POST` | `/movimientos` | Crea un movimiento. **Nota**: No ocupa vías inmediatamente, solo registra la intención. |
| `GET` | `/movimientos/:id` | Detalle del movimiento. Incluye objeto `meta` parseado de las instrucciones. |
| `PATCH` | `/movimientos/:id/iniciar` | Pasa a `EN_PROCESO`. Asigna operador. |
| `PATCH` | `/movimientos/:id/pausar` | Pasa a `DETENIDO`. |
| `PATCH` | `/movimientos/:id/finalizar` | Pasa a `CONCLUIDO`. Devuelve `accionesSugeridas` (liberar origen, ocupar destino) para que el frontend o servicio orquestador actúe. |
| `PATCH` | `/movimientos/:id/cancelar` | Pasa a `CANCELADO` y elimina su ronda. |
| `PATCH` | `/movimientos/:id/prioridad` | Cambia entre ALTA/BAJA. |
| `GET` | `/movimientos/servicios/pendientes` | Lista servicios (Lavado/Torno) pendientes. |

---

### 2.3 Infraestructura de Vías (`Via`)

Gestión física de los rieles.

**Modelo (`src/models/Via/viaModel.ts`):**
*   **Tipos de Vía**:
    1.  **Simple**: Sin secciones. Se ocupa la vía completa (`via.ocupada = true`).
    2.  **Seccionada**: Tiene submódulos (`SeccionVia`). Se ocupa por sección.
*   **Validaciones**: Evita doble ocupación (`ViaOcupadaPorOtroError`).
*   **Lógica**: `asignarMovimientoASeccion` decide si ocupar la vía entera o una sección específica. Si no se especifica sección en vía seccionada, busca la `primeraSeccionLibre`.

**Controlador (`src/Rutas/Via/viaController.ts`):**
| HTTP | Endpoint | Descripción |
| :--- | :--- | :--- |
| `GET` | `/vias` | Lista todas las vías con sus estados de ocupación. |
| `GET` | `/vias/localidad/:id` | Filtra vías por localidad. |
| `POST` | `/vias` | Crea nueva vía. |
| `PUT` | `/vias/:id` | Edita vía. |
| `DELETE` | `/vias/:id` | Elimina vía. |

---

### 2.4 Gestión de Incidentes (`Incidente`)

Reporte de fallos y bloqueos operacionales.

**Modelo (`src/models/Incidente/IncidenteModel.ts`):**
*   **Ciclo de Vida**:
    1.  `ABIERTO`: Incidente reportado.
    2.  `RESUELTO`: Solucionado preliminarmente. Puede reactivar el movimiento asociado (`EN_PROCESO`).
    3.  `CERRADO`: Confirmado y finalizado.
*   **Automatización**:
    *   **Auto-cierre**: Un cron interno (best-effort) cierra incidentes vencidos tras un tiempo configurado (`TIMEOUT_CONFIG`).
    *   **Reincidencia**: Si un movimiento acumula muchos cierres no resueltos (`MAX_CIERRES_NO_RESUELTOS`), se cancela el movimiento automáticamente.
*   **Imágenes**: Soporte para subida múltiple con `multer` y optimización con `sharp`.

**Controlador (`src/Rutas/Incidente/IncidenteController.ts`):**
| HTTP | Endpoint | Descripción |
| :--- | :--- | :--- |
| `GET` | `/incidentes` | Listado paginado y filtrable. |
| `POST` | `/incidentes` | Reportar incidente `multipart/form-data` (imágenes opcionales). |
| `PUT` | `/incidentes/:id` | Editar o cambiar estado. |
| `POST` | `/incidentes/:id/resolver` | Marca como RESUELTO. |
| `POST` | `/incidentes/:id/cerrar` | Marca como CERRADO. |
| `GET` | `/incidentes/:id/verificacion` | Consulta si el incidente está en periodo de verificación o bloqueo. |

---

### 2.5 Empresas y Localidades

Estructura administrativa básica.

**Empresa (`src/Rutas/Empresa/EmpresaController.ts`):**
*   CRUD estándar para gestionar los clientes/empresas del sistema.

**Localidad (`src/Rutas/Localidad/LocalidadController.ts`):**
*   CRUD estándar. Vincula usuarios y recursos (vías) a un espacio físico.

---

## 3. Notas Técnicas Adicionales

*   **Middleware de Auth**: La mayoría de las rutas protegidas requieren un JWT válido. El usuario se inyecta en `req.user`.
*   **Logging**: Se implementa un sistema de logs estructurados (`winston` o similar) por módulo (`usuario.logger`, `movimiento.logger`, etc.).
*   **Notificaciones**: Integración fuerte con Firebase (FCM) para notificar cambios de estado en tiempo real (ej. "Movimiento Iniciado" push notification).

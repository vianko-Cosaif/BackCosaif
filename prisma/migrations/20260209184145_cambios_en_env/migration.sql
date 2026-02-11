-- CreateEnum
CREATE TYPE "TokenTipo" AS ENUM ('ACCESS');

-- CreateEnum
CREATE TYPE "DeviceType" AS ENUM ('WEB', 'ANDROID', 'IOS', 'DESKTOP', 'OTHER');

-- CreateEnum
CREATE TYPE "EstadoActualizacion" AS ENUM ('ACTIVA', 'DESACTUALIZADA');

-- CreateEnum
CREATE TYPE "EstadoIncidente" AS ENUM ('ABIERTO', 'CERRADO', 'RESUELTO');

-- CreateEnum
CREATE TYPE "Prioridad" AS ENUM ('BAJA', 'ALTA');

-- CreateEnum
CREATE TYPE "EstadoMovimiento" AS ENUM ('SOLICITADO', 'EN_PROCESO', 'DETENIDO', 'ESPERA', 'MODIFICADO', 'CONCLUIDO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "Lavado" AS ENUM ('POSICION_UNO', 'POSICION_DOS');

-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('CLIENTE', 'SUPERVISOR', 'COORDINADOR', 'OPERADOR', 'MAQUINISTA', 'ADMINISTRADOR', 'LAVADO', 'TORNO');

-- CreateEnum
CREATE TYPE "PosicionCabina" AS ENUM ('Sin_Solicitar', 'DENTRO', 'AFUERA');

-- CreateEnum
CREATE TYPE "PosicionChimenea" AS ENUM ('Sin_Solicitar', 'DENTRO', 'AFUERA');

-- CreateEnum
CREATE TYPE "DireccionEmpuje" AS ENUM ('Sin_Solicitar', 'EMPUJAR', 'JALAR');

-- CreateEnum
CREATE TYPE "TipoMovimiento" AS ENUM ('MD_TRABAJANDO', 'REMOLCADA');

-- CreateEnum
CREATE TYPE "ServicioTipo" AS ENUM ('LAVADO', 'TORNO');

-- CreateEnum
CREATE TYPE "ServicioEstado" AS ENUM ('DETENIDO', 'EN_SERVICIO', 'FINALIZADO');

-- CreateEnum
CREATE TYPE "AccionSeguimiento" AS ENUM ('COMENTARIO', 'CAMBIO_STATUS', 'ADJUNTO', 'ASIGNACION', 'CIERRE', 'REAPERTURA');

-- CreateTable
CREATE TABLE "Empresa" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Empresa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Localidad" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Localidad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "contrasena" TEXT NOT NULL,
    "rol" "Rol" NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "localidadId" INTEGER NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tokenVersion" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FcmToken" (
    "id" SERIAL NOT NULL,
    "token" VARCHAR(500) NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FcmToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Via" (
    "id" SERIAL NOT NULL,
    "numero" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "localidadId" INTEGER NOT NULL,
    "ocupada" BOOLEAN NOT NULL DEFAULT false,
    "movimientoId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Via_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeccionVia" (
    "id" SERIAL NOT NULL,
    "viaId" INTEGER NOT NULL,
    "numero" INTEGER NOT NULL,
    "nombre" TEXT,
    "ocupada" BOOLEAN NOT NULL DEFAULT false,
    "movimientoId" INTEGER,

    CONSTRAINT "SeccionVia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Movimiento" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "creadoPorId" INTEGER NOT NULL,
    "clienteId" INTEGER,
    "supervisorId" INTEGER,
    "coordinadorId" INTEGER,
    "operadorId" INTEGER,
    "localidadId" INTEGER NOT NULL,
    "viaOrigenId" INTEGER,
    "viaDestinoId" INTEGER,
    "locomotiveNumber" INTEGER NOT NULL,
    "lavado" BOOLEAN DEFAULT false,
    "torno" BOOLEAN DEFAULT false,
    "prioridad" "Prioridad" NOT NULL DEFAULT 'BAJA',
    "tipoMovimiento" "TipoMovimiento",
    "estado" "EstadoMovimiento" NOT NULL DEFAULT 'SOLICITADO',
    "fechaSolicitud" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaInicio" TIMESTAMP(3),
    "fechaFin" TIMESTAMP(3),
    "fechaPausa" TIMESTAMP(3),
    "instrucciones" TEXT,
    "posicionChimenea" "PosicionChimenea",
    "finalizado" BOOLEAN DEFAULT false,
    "incidenteGlobal" BOOLEAN DEFAULT false,
    "direccionEmpuje" "DireccionEmpuje" DEFAULT 'Sin_Solicitar',
    "posicionCabina" "PosicionCabina",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Movimiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Incidente" (
    "id" SERIAL NOT NULL,
    "descripcion" TEXT NOT NULL,
    "imagen1" TEXT,
    "imagen2" TEXT,
    "imagen3" TEXT,
    "imagen4" TEXT,
    "movimientoId" INTEGER NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "estado" "EstadoIncidente" NOT NULL DEFAULT 'ABIERTO',
    "fechaInicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaFin" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Incidente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ronda" (
    "id" SERIAL NOT NULL,
    "movimientoId" INTEGER NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "localidadId" INTEGER NOT NULL,
    "concluido" BOOLEAN DEFAULT false,
    "orden" INTEGER NOT NULL,
    "rondaNumero" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ronda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServicioCola" (
    "id" SERIAL NOT NULL,
    "localidadId" INTEGER NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "movimientoId" INTEGER NOT NULL,
    "tipo" "ServicioTipo" NOT NULL,
    "estado" "ServicioEstado" NOT NULL DEFAULT 'EN_SERVICIO',
    "orden" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServicioCola_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Token" (
    "jti" UUID NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "tipo" "TokenTipo" NOT NULL DEFAULT 'ACCESS',
    "scope" VARCHAR(256),
    "ip" INET,
    "ua" VARCHAR(512),
    "deviceId" VARCHAR(128),
    "platform" "DeviceType" NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "reason" VARCHAR(64),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Token_pkey" PRIMARY KEY ("jti")
);

-- CreateTable
CREATE TABLE "IpUsuario" (
    "usuarioId" INTEGER NOT NULL,
    "ip" INET NOT NULL,
    "tipoDispositivo" "DeviceType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IpUsuario_pkey" PRIMARY KEY ("usuarioId","ip","tipoDispositivo")
);

-- CreateTable
CREATE TABLE "actualizacion" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "fechalanzamiento" TIMESTAMP(3) NOT NULL,
    "estado" "EstadoActualizacion" NOT NULL DEFAULT 'ACTIVA',

    CONSTRAINT "actualizacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TornoT" (
    "id" SERIAL NOT NULL,
    "movimientoId" INTEGER NOT NULL,
    "localidadId" INTEGER NOT NULL,
    "status" "ServicioEstado" NOT NULL DEFAULT 'EN_SERVICIO',
    "inicio" TIMESTAMP(3),
    "fin" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TornoT_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LavadoT" (
    "id" SERIAL NOT NULL,
    "movimientoId" INTEGER NOT NULL,
    "localidadId" INTEGER NOT NULL,
    "status" "ServicioEstado" NOT NULL DEFAULT 'EN_SERVICIO',
    "inicio" TIMESTAMP(3),
    "fin" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LavadoT_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Navaja" (
    "id" SERIAL NOT NULL,
    "numero" INTEGER NOT NULL,
    "localidadId" INTEGER NOT NULL,
    "ultimoMantenimiento" TIMESTAMP(3),
    "proximoMantenimiento" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Navaja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncidenteTorno" (
    "id" SERIAL NOT NULL,
    "movimientoId" INTEGER NOT NULL,
    "tornoId" INTEGER NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "localidadId" INTEGER NOT NULL,
    "comentarios" TEXT,
    "fotos" TEXT[],
    "status" "EstadoIncidente" NOT NULL DEFAULT 'ABIERTO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IncidenteTorno_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncidenteLavado" (
    "id" SERIAL NOT NULL,
    "lavadoId" INTEGER NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "localidadId" INTEGER NOT NULL,
    "comentarios" TEXT,
    "imagenes" TEXT[],
    "status" "EstadoIncidente" NOT NULL DEFAULT 'ABIERTO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IncidenteLavado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeguimientoTorno" (
    "id" SERIAL NOT NULL,
    "incidenteId" INTEGER NOT NULL,
    "tornoId" INTEGER NOT NULL,
    "localidadId" INTEGER NOT NULL,
    "actorId" INTEGER NOT NULL,
    "accion" "AccionSeguimiento" NOT NULL,
    "comentario" TEXT,
    "imagenes" TEXT[],
    "deStatus" "EstadoIncidente",
    "aStatus" "EstadoIncidente",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeguimientoTorno_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeguimientoLavado" (
    "id" SERIAL NOT NULL,
    "incidenteId" INTEGER NOT NULL,
    "lavadoId" INTEGER NOT NULL,
    "localidadId" INTEGER NOT NULL,
    "actorId" INTEGER NOT NULL,
    "accion" "AccionSeguimiento" NOT NULL,
    "comentario" TEXT,
    "imagenes" TEXT[],
    "deStatus" "EstadoIncidente",
    "aStatus" "EstadoIncidente",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeguimientoLavado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedidasTornoI" (
    "id" SERIAL NOT NULL,
    "id_TornoT" INTEGER NOT NULL,
    "L1" TEXT NOT NULL,
    "R1" TEXT NOT NULL,
    "L2" TEXT NOT NULL,
    "R2" TEXT NOT NULL,
    "L3" TEXT NOT NULL,
    "R3" TEXT NOT NULL,
    "L4" TEXT NOT NULL,
    "R4" TEXT NOT NULL,
    "L5" TEXT NOT NULL,
    "R5" TEXT NOT NULL,
    "L6" TEXT NOT NULL,
    "R6" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MedidasTornoI_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedidasTornoF" (
    "id" SERIAL NOT NULL,
    "id_TornoT" INTEGER NOT NULL,
    "L1" TEXT NOT NULL,
    "R1" TEXT NOT NULL,
    "L2" TEXT NOT NULL,
    "R2" TEXT NOT NULL,
    "L3" TEXT NOT NULL,
    "R3" TEXT NOT NULL,
    "L4" TEXT NOT NULL,
    "R4" TEXT NOT NULL,
    "L5" TEXT NOT NULL,
    "R5" TEXT NOT NULL,
    "L6" TEXT NOT NULL,
    "R6" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MedidasTornoF_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Empresa_nombre_key" ON "Empresa"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Localidad_nombre_key" ON "Localidad"("nombre");

-- CreateIndex
CREATE INDEX "Localidad_nombre_idx" ON "Localidad"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_nombre_key" ON "Usuario"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE INDEX "Usuario_empresaId_activo_idx" ON "Usuario"("empresaId", "activo");

-- CreateIndex
CREATE INDEX "Usuario_localidadId_rol_idx" ON "Usuario"("localidadId", "rol");

-- CreateIndex
CREATE UNIQUE INDEX "FcmToken_token_key" ON "FcmToken"("token");

-- CreateIndex
CREATE INDEX "FcmToken_usuarioId_idx" ON "FcmToken"("usuarioId");

-- CreateIndex
CREATE INDEX "Via_movimientoId_idx" ON "Via"("movimientoId");

-- CreateIndex
CREATE INDEX "Via_localidadId_numero_idx" ON "Via"("localidadId", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "Via_numero_localidadId_key" ON "Via"("numero", "localidadId");

-- CreateIndex
CREATE UNIQUE INDEX "Via_nombre_localidadId_key" ON "Via"("nombre", "localidadId");

-- CreateIndex
CREATE INDEX "SeccionVia_viaId_ocupada_idx" ON "SeccionVia"("viaId", "ocupada");

-- CreateIndex
CREATE INDEX "SeccionVia_viaId_movimientoId_idx" ON "SeccionVia"("viaId", "movimientoId");

-- CreateIndex
CREATE INDEX "SeccionVia_viaId_movimientoId_ocupada_idx" ON "SeccionVia"("viaId", "movimientoId", "ocupada");

-- CreateIndex
CREATE UNIQUE INDEX "SeccionVia_viaId_numero_key" ON "SeccionVia"("viaId", "numero");

-- CreateIndex
CREATE INDEX "Movimiento_empresaId_estado_idx" ON "Movimiento"("empresaId", "estado");

-- CreateIndex
CREATE INDEX "Movimiento_fechaInicio_fechaFin_idx" ON "Movimiento"("fechaInicio", "fechaFin");

-- CreateIndex
CREATE INDEX "Movimiento_estado_finalizado_idx" ON "Movimiento"("estado", "finalizado");

-- CreateIndex
CREATE INDEX "Movimiento_clienteId_estado_idx" ON "Movimiento"("clienteId", "estado");

-- CreateIndex
CREATE INDEX "Movimiento_supervisorId_estado_idx" ON "Movimiento"("supervisorId", "estado");

-- CreateIndex
CREATE INDEX "Movimiento_coordinadorId_estado_idx" ON "Movimiento"("coordinadorId", "estado");

-- CreateIndex
CREATE INDEX "Movimiento_operadorId_estado_idx" ON "Movimiento"("operadorId", "estado");

-- CreateIndex
CREATE INDEX "Movimiento_localidadId_estado_idx" ON "Movimiento"("localidadId", "estado");

-- CreateIndex
CREATE INDEX "Movimiento_viaOrigenId_viaDestinoId_idx" ON "Movimiento"("viaOrigenId", "viaDestinoId");

-- CreateIndex
CREATE INDEX "Incidente_estado_fechaInicio_idx" ON "Incidente"("estado", "fechaInicio");

-- CreateIndex
CREATE INDEX "Incidente_movimientoId_estado_idx" ON "Incidente"("movimientoId", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "Ronda_movimientoId_key" ON "Ronda"("movimientoId");

-- CreateIndex
CREATE INDEX "Ronda_rondaNumero_orden_idx" ON "Ronda"("rondaNumero", "orden");

-- CreateIndex
CREATE INDEX "Ronda_localidadId_idx" ON "Ronda"("localidadId");

-- CreateIndex
CREATE UNIQUE INDEX "ServicioCola_movimientoId_key" ON "ServicioCola"("movimientoId");

-- CreateIndex
CREATE INDEX "ServicioCola_localidadId_tipo_estado_orden_idx" ON "ServicioCola"("localidadId", "tipo", "estado", "orden");

-- CreateIndex
CREATE INDEX "ServicioCola_empresaId_estado_idx" ON "ServicioCola"("empresaId", "estado");

-- CreateIndex
CREATE INDEX "Token_usuarioId_expiresAt_revokedAt_idx" ON "Token"("usuarioId", "expiresAt", "revokedAt");

-- CreateIndex
CREATE INDEX "Token_expiresAt_idx" ON "Token"("expiresAt");

-- CreateIndex
CREATE INDEX "Token_ip_idx" ON "Token"("ip");

-- CreateIndex
CREATE INDEX "Token_deviceId_idx" ON "Token"("deviceId");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_user_platform" ON "Token"("usuarioId", "platform");

-- CreateIndex
CREATE INDEX "IpUsuario_ip_idx" ON "IpUsuario"("ip");

-- CreateIndex
CREATE INDEX "TornoT_movimientoId_idx" ON "TornoT"("movimientoId");

-- CreateIndex
CREATE INDEX "TornoT_movimientoId_createdAt_idx" ON "TornoT"("movimientoId", "createdAt");

-- CreateIndex
CREATE INDEX "TornoT_movimientoId_status_idx" ON "TornoT"("movimientoId", "status");

-- CreateIndex
CREATE INDEX "TornoT_localidadId_status_createdAt_idx" ON "TornoT"("localidadId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "LavadoT_movimientoId_status_idx" ON "LavadoT"("movimientoId", "status");

-- CreateIndex
CREATE INDEX "LavadoT_localidadId_status_createdAt_idx" ON "LavadoT"("localidadId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Navaja_numero_localidadId_key" ON "Navaja"("numero", "localidadId");

-- CreateIndex
CREATE INDEX "IncidenteTorno_movimientoId_status_idx" ON "IncidenteTorno"("movimientoId", "status");

-- CreateIndex
CREATE INDEX "IncidenteTorno_tornoId_idx" ON "IncidenteTorno"("tornoId");

-- CreateIndex
CREATE INDEX "IncidenteTorno_tornoId_createdAt_idx" ON "IncidenteTorno"("tornoId", "createdAt");

-- CreateIndex
CREATE INDEX "IncidenteTorno_localidadId_status_createdAt_idx" ON "IncidenteTorno"("localidadId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "IncidenteLavado_lavadoId_idx" ON "IncidenteLavado"("lavadoId");

-- CreateIndex
CREATE INDEX "IncidenteLavado_lavadoId_createdAt_idx" ON "IncidenteLavado"("lavadoId", "createdAt");

-- CreateIndex
CREATE INDEX "IncidenteLavado_lavadoId_status_idx" ON "IncidenteLavado"("lavadoId", "status");

-- CreateIndex
CREATE INDEX "IncidenteLavado_localidadId_status_createdAt_idx" ON "IncidenteLavado"("localidadId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "SeguimientoTorno_incidenteId_createdAt_idx" ON "SeguimientoTorno"("incidenteId", "createdAt");

-- CreateIndex
CREATE INDEX "SeguimientoTorno_localidadId_accion_createdAt_idx" ON "SeguimientoTorno"("localidadId", "accion", "createdAt");

-- CreateIndex
CREATE INDEX "SeguimientoTorno_actorId_createdAt_idx" ON "SeguimientoTorno"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "SeguimientoLavado_incidenteId_createdAt_idx" ON "SeguimientoLavado"("incidenteId", "createdAt");

-- CreateIndex
CREATE INDEX "SeguimientoLavado_localidadId_accion_createdAt_idx" ON "SeguimientoLavado"("localidadId", "accion", "createdAt");

-- CreateIndex
CREATE INDEX "SeguimientoLavado_actorId_createdAt_idx" ON "SeguimientoLavado"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "MedidasTornoI_id_TornoT_idx" ON "MedidasTornoI"("id_TornoT");

-- CreateIndex
CREATE INDEX "MedidasTornoF_id_TornoT_idx" ON "MedidasTornoF"("id_TornoT");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_localidadId_fkey" FOREIGN KEY ("localidadId") REFERENCES "Localidad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FcmToken" ADD CONSTRAINT "FcmToken_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Via" ADD CONSTRAINT "Via_movimientoId_fkey" FOREIGN KEY ("movimientoId") REFERENCES "Movimiento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Via" ADD CONSTRAINT "Via_localidadId_fkey" FOREIGN KEY ("localidadId") REFERENCES "Localidad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeccionVia" ADD CONSTRAINT "SeccionVia_movimientoId_fkey" FOREIGN KEY ("movimientoId") REFERENCES "Movimiento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeccionVia" ADD CONSTRAINT "SeccionVia_viaId_fkey" FOREIGN KEY ("viaId") REFERENCES "Via"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movimiento" ADD CONSTRAINT "Movimiento_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movimiento" ADD CONSTRAINT "Movimiento_coordinadorId_fkey" FOREIGN KEY ("coordinadorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movimiento" ADD CONSTRAINT "Movimiento_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movimiento" ADD CONSTRAINT "Movimiento_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movimiento" ADD CONSTRAINT "Movimiento_localidadId_fkey" FOREIGN KEY ("localidadId") REFERENCES "Localidad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movimiento" ADD CONSTRAINT "Movimiento_operadorId_fkey" FOREIGN KEY ("operadorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movimiento" ADD CONSTRAINT "Movimiento_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movimiento" ADD CONSTRAINT "Movimiento_viaDestinoId_fkey" FOREIGN KEY ("viaDestinoId") REFERENCES "Via"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movimiento" ADD CONSTRAINT "Movimiento_viaOrigenId_fkey" FOREIGN KEY ("viaOrigenId") REFERENCES "Via"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incidente" ADD CONSTRAINT "Incidente_movimientoId_fkey" FOREIGN KEY ("movimientoId") REFERENCES "Movimiento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incidente" ADD CONSTRAINT "Incidente_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ronda" ADD CONSTRAINT "Ronda_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ronda" ADD CONSTRAINT "Ronda_movimientoId_fkey" FOREIGN KEY ("movimientoId") REFERENCES "Movimiento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ronda" ADD CONSTRAINT "Ronda_localidadId_fkey" FOREIGN KEY ("localidadId") REFERENCES "Localidad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicioCola" ADD CONSTRAINT "ServicioCola_localidadId_fkey" FOREIGN KEY ("localidadId") REFERENCES "Localidad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicioCola" ADD CONSTRAINT "ServicioCola_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicioCola" ADD CONSTRAINT "ServicioCola_movimientoId_fkey" FOREIGN KEY ("movimientoId") REFERENCES "Movimiento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Token" ADD CONSTRAINT "Token_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IpUsuario" ADD CONSTRAINT "IpUsuario_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TornoT" ADD CONSTRAINT "TornoT_movimientoId_fkey" FOREIGN KEY ("movimientoId") REFERENCES "Movimiento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TornoT" ADD CONSTRAINT "TornoT_localidadId_fkey" FOREIGN KEY ("localidadId") REFERENCES "Localidad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LavadoT" ADD CONSTRAINT "LavadoT_movimientoId_fkey" FOREIGN KEY ("movimientoId") REFERENCES "Movimiento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LavadoT" ADD CONSTRAINT "LavadoT_localidadId_fkey" FOREIGN KEY ("localidadId") REFERENCES "Localidad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Navaja" ADD CONSTRAINT "Navaja_localidadId_fkey" FOREIGN KEY ("localidadId") REFERENCES "Localidad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidenteTorno" ADD CONSTRAINT "IncidenteTorno_movimientoId_fkey" FOREIGN KEY ("movimientoId") REFERENCES "Movimiento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidenteTorno" ADD CONSTRAINT "IncidenteTorno_tornoId_fkey" FOREIGN KEY ("tornoId") REFERENCES "TornoT"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidenteTorno" ADD CONSTRAINT "IncidenteTorno_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidenteTorno" ADD CONSTRAINT "IncidenteTorno_localidadId_fkey" FOREIGN KEY ("localidadId") REFERENCES "Localidad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidenteLavado" ADD CONSTRAINT "IncidenteLavado_lavadoId_fkey" FOREIGN KEY ("lavadoId") REFERENCES "LavadoT"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidenteLavado" ADD CONSTRAINT "IncidenteLavado_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidenteLavado" ADD CONSTRAINT "IncidenteLavado_localidadId_fkey" FOREIGN KEY ("localidadId") REFERENCES "Localidad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeguimientoTorno" ADD CONSTRAINT "SeguimientoTorno_incidenteId_fkey" FOREIGN KEY ("incidenteId") REFERENCES "IncidenteTorno"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeguimientoTorno" ADD CONSTRAINT "SeguimientoTorno_tornoId_fkey" FOREIGN KEY ("tornoId") REFERENCES "TornoT"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeguimientoTorno" ADD CONSTRAINT "SeguimientoTorno_localidadId_fkey" FOREIGN KEY ("localidadId") REFERENCES "Localidad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeguimientoTorno" ADD CONSTRAINT "SeguimientoTorno_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeguimientoLavado" ADD CONSTRAINT "SeguimientoLavado_incidenteId_fkey" FOREIGN KEY ("incidenteId") REFERENCES "IncidenteLavado"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeguimientoLavado" ADD CONSTRAINT "SeguimientoLavado_lavadoId_fkey" FOREIGN KEY ("lavadoId") REFERENCES "LavadoT"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeguimientoLavado" ADD CONSTRAINT "SeguimientoLavado_localidadId_fkey" FOREIGN KEY ("localidadId") REFERENCES "Localidad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeguimientoLavado" ADD CONSTRAINT "SeguimientoLavado_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedidasTornoI" ADD CONSTRAINT "MedidasTornoI_id_TornoT_fkey" FOREIGN KEY ("id_TornoT") REFERENCES "TornoT"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedidasTornoF" ADD CONSTRAINT "MedidasTornoF_id_TornoT_fkey" FOREIGN KEY ("id_TornoT") REFERENCES "TornoT"("id") ON DELETE CASCADE ON UPDATE CASCADE;

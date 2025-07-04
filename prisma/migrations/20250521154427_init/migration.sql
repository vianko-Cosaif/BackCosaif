-- CreateEnum
CREATE TYPE "EstadoIncidente" AS ENUM ('ABIERTO', 'CERRADO');

-- CreateEnum
CREATE TYPE "Prioridad" AS ENUM ('BAJA', 'ALTA');

-- CreateEnum
CREATE TYPE "EstadoMovimiento" AS ENUM ('SOLICITADO', 'EN_PROCESO', 'DETENIDO', 'ESPERA', 'MODIFICADO', 'CONCLUIDO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "Lavado" AS ENUM ('POSICION_UNO', 'POSICION_DOS');

-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('CLIENTE', 'SUPERVISOR', 'COORDINADOR', 'OPERADOR', 'MAQUINISTA', 'ADMINISTRADOR');

-- CreateEnum
CREATE TYPE "PosicionCabina" AS ENUM ('Sin_Solicitar', 'DENTRO', 'AFUERA');

-- CreateEnum
CREATE TYPE "PosicionChimenea" AS ENUM ('Sin_Solicitar', 'DENTRO', 'AFUERA');

-- CreateEnum
CREATE TYPE "DireccionEmpuje" AS ENUM ('Sin_Solicitar', 'EMPUJAR', 'JALAR');

-- CreateEnum
CREATE TYPE "TipoMovimiento" AS ENUM ('MD_TRABAJANDO', 'REMOLCADA');

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

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Via" (
    "id" SERIAL NOT NULL,
    "numero" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "localidadId" INTEGER NOT NULL,
    "ocupada" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Via_pkey" PRIMARY KEY ("id")
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
    "viaOrigenId" INTEGER NOT NULL,
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
CREATE TABLE "Token" (
    "id" SERIAL NOT NULL,
    "token" VARCHAR(500) NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'auth',
    "usuarioId" INTEGER NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Actualizacion" (
    "id" SERIAL NOT NULL,
    "version" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cambios" TEXT NOT NULL,
    "creadoPor" TEXT NOT NULL,
    "estatus" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Actualizacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Empresa_nombre_key" ON "Empresa"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Localidad_nombre_key" ON "Localidad"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_nombre_key" ON "Usuario"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE INDEX "Usuario_empresaId_activo_idx" ON "Usuario"("empresaId", "activo");

-- CreateIndex
CREATE INDEX "Usuario_localidadId_rol_idx" ON "Usuario"("localidadId", "rol");

-- CreateIndex
CREATE UNIQUE INDEX "Via_numero_localidadId_key" ON "Via"("numero", "localidadId");

-- CreateIndex
CREATE UNIQUE INDEX "Via_nombre_localidadId_key" ON "Via"("nombre", "localidadId");

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
CREATE UNIQUE INDEX "Token_token_key" ON "Token"("token");

-- CreateIndex
CREATE INDEX "Token_usuarioId_tipo_idx" ON "Token"("usuarioId", "tipo");

-- CreateIndex
CREATE INDEX "Actualizacion_version_idx" ON "Actualizacion"("version");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_localidadId_fkey" FOREIGN KEY ("localidadId") REFERENCES "Localidad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Via" ADD CONSTRAINT "Via_localidadId_fkey" FOREIGN KEY ("localidadId") REFERENCES "Localidad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movimiento" ADD CONSTRAINT "Movimiento_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movimiento" ADD CONSTRAINT "Movimiento_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movimiento" ADD CONSTRAINT "Movimiento_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movimiento" ADD CONSTRAINT "Movimiento_coordinadorId_fkey" FOREIGN KEY ("coordinadorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movimiento" ADD CONSTRAINT "Movimiento_operadorId_fkey" FOREIGN KEY ("operadorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movimiento" ADD CONSTRAINT "Movimiento_localidadId_fkey" FOREIGN KEY ("localidadId") REFERENCES "Localidad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movimiento" ADD CONSTRAINT "Movimiento_viaOrigenId_fkey" FOREIGN KEY ("viaOrigenId") REFERENCES "Via"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movimiento" ADD CONSTRAINT "Movimiento_viaDestinoId_fkey" FOREIGN KEY ("viaDestinoId") REFERENCES "Via"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movimiento" ADD CONSTRAINT "Movimiento_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incidente" ADD CONSTRAINT "Incidente_movimientoId_fkey" FOREIGN KEY ("movimientoId") REFERENCES "Movimiento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incidente" ADD CONSTRAINT "Incidente_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ronda" ADD CONSTRAINT "Ronda_movimientoId_fkey" FOREIGN KEY ("movimientoId") REFERENCES "Movimiento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ronda" ADD CONSTRAINT "Ronda_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Token" ADD CONSTRAINT "Token_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

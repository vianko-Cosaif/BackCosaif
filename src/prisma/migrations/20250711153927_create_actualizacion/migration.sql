/*
  Warnings:

  - You are about to drop the `Actualizacion` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "EstadoActualizacion" AS ENUM ('ACTIVA', 'DESACTUALIZADA');

-- DropTable
DROP TABLE "Actualizacion";

-- CreateTable
CREATE TABLE "actualizacion" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "fecha_lanzamiento" TIMESTAMP(3) NOT NULL,
    "estado" "EstadoActualizacion" NOT NULL DEFAULT 'ACTIVA',

    CONSTRAINT "actualizacion_pkey" PRIMARY KEY ("id")
);

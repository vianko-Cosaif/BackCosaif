/*
  Warnings:

  - You are about to drop the column `fecha_lanzamiento` on the `actualizacion` table. All the data in the column will be lost.
  - Added the required column `fechalanzamiento` to the `actualizacion` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "actualizacion" DROP COLUMN "fecha_lanzamiento",
ADD COLUMN     "fechalanzamiento" TIMESTAMP(3) NOT NULL;

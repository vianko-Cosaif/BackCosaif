require("dotenv").config();

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const normalize = (value) => String(value ?? "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .trim()
  .toLowerCase();

const VIAS = [1, 2, 3, 4, 5, 6];
const SECCIONES_POR_VIA = [1, 2, 3, 4];

async function getOrCreateTorreon() {
  const localidades = await prisma.localidad.findMany({
    select: { id: true, nombre: true, estado: true },
  });

  const existente = localidades.find((localidad) => normalize(localidad.nombre) === "torreon");
  if (existente) return existente;

  return prisma.localidad.create({
    data: {
      nombre: "Torreon",
      estado: "Coahuila",
    },
  });
}

async function main() {
  const localidad = await getOrCreateTorreon();

  const vias = [];
  for (const numero of VIAS) {
    const via = await prisma.via.upsert({
      where: {
        numero_localidadId: {
          numero,
          localidadId: localidad.id,
        },
      },
      update: {},
      create: {
        numero,
        nombre: `Via ${numero}`,
        localidadId: localidad.id,
      },
    });
    vias.push(via);

    for (const seccionNumero of SECCIONES_POR_VIA) {
      await prisma.seccionVia.upsert({
        where: {
          viaId_numero: {
            viaId: via.id,
            numero: seccionNumero,
          },
        },
        update: {},
        create: {
          viaId: via.id,
          numero: seccionNumero,
          nombre: `Seccion ${seccionNumero}`,
        },
      });
    }
  }

  const resumen = await prisma.localidad.findUnique({
    where: { id: localidad.id },
    select: {
      id: true,
      nombre: true,
      estado: true,
      vias: {
        select: {
          id: true,
          numero: true,
          nombre: true,
          secciones: {
            select: { id: true, numero: true, nombre: true },
            orderBy: { numero: "asc" },
          },
        },
        orderBy: { numero: "asc" },
      },
    },
  });

  console.log(JSON.stringify({
    ok: true,
    localidadId: localidad.id,
    vias: resumen?.vias.length ?? 0,
    secciones: resumen?.vias.reduce((acc, via) => acc + via.secciones.length, 0) ?? 0,
    resumen,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

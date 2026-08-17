import { z } from "zod";

const idSchema = z.coerce.number().int().positive();
const cleanName = z.string().trim().min(1).max(100);

const sectionSchema = z.object({
  id: idSchema.optional(),
  numero: z.coerce.number().int().positive(),
  nombre: cleanName,
});

const trackSchema = z.object({
  id: idSchema.optional(),
  numero: z.coerce.number().int().positive(),
  nombre: cleanName,
  secciones: z.array(sectionSchema).min(1).max(200),
}).superRefine((track, ctx) => {
  const numbers = new Set<number>();
  const names = new Set<string>();
  track.secciones.forEach((section, index) => {
    const name = section.nombre.toLocaleLowerCase("es-MX");
    if (numbers.has(section.numero)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Sección ${section.numero} repetida`, path: ["secciones", index, "numero"] });
    }
    if (names.has(name)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Nombre de sección “${section.nombre}” repetido`, path: ["secciones", index, "nombre"] });
    }
    numbers.add(section.numero);
    names.add(name);
  });
});

export const listCatalogoArrastreSchema = z.object({
  localidadId: idSchema,
});

export const saveCatalogoArrastreSchema = z.object({
  localidadId: idSchema,
  vias: z.array(trackSchema).min(1).max(300),
}).superRefine((payload, ctx) => {
  const numbers = new Set<number>();
  const names = new Set<string>();
  payload.vias.forEach((track, index) => {
    const name = track.nombre.toLocaleLowerCase("es-MX");
    if (numbers.has(track.numero)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Vía ${track.numero} repetida`, path: ["vias", index, "numero"] });
    }
    if (names.has(name)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Nombre de vía “${track.nombre}” repetido`, path: ["vias", index, "nombre"] });
    }
    numbers.add(track.numero);
    names.add(name);
  });
});

type LocalidadLike = {
  id?: number | null;
  nombre?: string | null;
};

export const normalizarNombreLocalidad = (nombre?: string | null) => {
  return String(nombre ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
};

export const esLocalidadTorreon = (nombre?: string | null) => {
  return normalizarNombreLocalidad(nombre) === "torreon";
};

export const buildOperacionLocalidad = (localidad?: LocalidadLike | null) => {
  const normalizada = normalizarNombreLocalidad(localidad?.nombre);
  const torreon = normalizada === "torreon";

  return {
    clave: torreon ? "TORREON" : "COSAIF",
    localidadId: localidad?.id ?? null,
    localidadNombre: localidad?.nombre ?? null,
    localidadNormalizada: normalizada || null,
    usaMsTorreon: torreon,
    modulos: {
      movimientos: torreon ? "MS_TORREON" : "COSAIF",
      rondas: torreon ? "MS_TORREON" : "COSAIF",
      incidentes: torreon ? "MS_TORREON" : "COSAIF",
    },
  };
};

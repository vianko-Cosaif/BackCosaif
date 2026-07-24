export const FASES_LAVADO = [
  { clave: "PREPARACION", nombre: "Preparación", orden: 1 },
  { clave: "PRELAVADO", nombre: "Prelavado", orden: 2 },
  { clave: "LAVADO_PRINCIPAL", nombre: "Lavado principal", orden: 3 },
  { clave: "LAVADO_BAJOS", nombre: "Lavado de bajos", orden: 4 },
  { clave: "ENJUAGUE", nombre: "Enjuague", orden: 5 },
  { clave: "SECADO", nombre: "Secado", orden: 6 },
] as const;

const businessDateParts = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const value = (type: "year" | "month" | "day") => {
    return parts.find((part) => part.type === type)?.value ?? "";
  };

  return `${value("year")}${value("month")}${value("day")}`;
};

export const crearFolioLavado = (id: string, date = new Date()) => {
  const suffix = id.replace(/-/g, "").slice(0, 8).toUpperCase();
  return `LAV-${businessDateParts(date)}-${suffix}`;
};

export const duracionSegundos = (inicio: Date, fin: Date) => {
  return Math.max(0, Math.floor((fin.getTime() - inicio.getTime()) / 1000));
};

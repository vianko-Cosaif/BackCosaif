import { PrismaClient } from "../../generated";

declare global {
  // eslint-disable-next-line no-var
  var __prismaComercial: PrismaClient | undefined;
}

export const prismaComercial =
  global.__prismaComercial ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.__prismaComercial = prismaComercial;
}

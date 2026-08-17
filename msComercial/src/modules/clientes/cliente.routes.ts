import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import {
  createCliente,
  createContacto,
  getCliente,
  listClientes,
  updateCliente,
  updateContacto,
} from "./cliente.controller";

export const clienteRouter = Router();

clienteRouter.get("/", asyncHandler(listClientes));
clienteRouter.post("/", asyncHandler(createCliente));
clienteRouter.get("/:id", asyncHandler(getCliente));
clienteRouter.patch("/:id", asyncHandler(updateCliente));
clienteRouter.post("/:id/contactos", asyncHandler(createContacto));
clienteRouter.patch("/:id/contactos/:contactoId", asyncHandler(updateContacto));

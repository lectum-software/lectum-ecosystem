import { Router } from "express";
import { downloadAdminInvoice } from "./use-cases/controller";
import { invoicePdfValidator } from "./validator";

const routes = Router();
routes.get("/:id/pdf", invoicePdfValidator, downloadAdminInvoice);
export default routes;

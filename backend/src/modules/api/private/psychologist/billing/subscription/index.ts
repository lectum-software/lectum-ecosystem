import { Router } from "express";
import { cancel, show } from "./use-cases/controller";
import { downloadInvoice } from "./use-cases/invoice";
import { invoiceValidator } from "./validator";

const routes = Router();

routes.get("", show);
routes.get("/invoices/:id/pdf", invoiceValidator, downloadInvoice);
routes.post("/cancel", cancel);

export default routes;

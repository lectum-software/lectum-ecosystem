import { Router } from "express";
import { reportController } from "./use-cases/controller";
import { answerValidator, historyValidator, reportValidator } from "./validator";

const routes = Router();
routes.get("/", historyValidator, reportController("history"));
routes.put("/week/:id", answerValidator, reportController("save"));
routes.get("/latest", reportController("latest"));
routes.get("/:id", reportValidator, reportController("show"));
routes.post("/:id/claim", reportValidator, reportController("claim"));
routes.post("/:id/open", reportValidator, reportController("open"));
routes.put("/:id", answerValidator, reportController("answer"));
export default routes;

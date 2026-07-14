import { Router } from "express";
import adminAuth from "../../../middlewares/_auth";
import {
  changeEmail,
  deactivateAccount,
  deleteAccount,
  revokeSessions,
  sendEmailConfirmation,
  sendPasswordReset,
  setTemporaryPassword,
  show,
  suspendAccount,
} from "./use-cases/controller";
import {
  changeEmailValidator,
  reasonOnlyValidator,
  revokeSessionsValidator,
  setTemporaryPasswordValidator,
  showAccountValidator,
  suspendAccountValidator,
} from "./validator";

const routes = Router();

routes.use(adminAuth);
routes.get("/:id/account", showAccountValidator, show);
routes.post("/:id/account/change-email", changeEmailValidator, changeEmail);
routes.post("/:id/account/send-email-confirmation", reasonOnlyValidator, sendEmailConfirmation);
routes.post("/:id/account/send-password-reset", reasonOnlyValidator, sendPasswordReset);
routes.post(
  "/:id/account/set-temporary-password",
  setTemporaryPasswordValidator,
  setTemporaryPassword,
);
routes.post("/:id/account/suspend", suspendAccountValidator, suspendAccount);
routes.post("/:id/account/deactivate", revokeSessionsValidator, deactivateAccount);
routes.post("/:id/account/delete", revokeSessionsValidator, deleteAccount);
routes.post("/:id/account/revoke-sessions", revokeSessionsValidator, revokeSessions);

export default routes;

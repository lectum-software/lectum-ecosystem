import { Router } from "express";

import apiPrivateAuthCode from "@/modules/api/private/auth/code";
import apiPrivateAuthConfirm from "@/modules/api/private/auth/confirm";
import apiPrivateAuthHidrate from "@/modules/api/private/auth/hidrate";
import apiPrivateAuthNeedReset from "@/modules/api/private/auth/need_reset";
import apiPrivateAuthReset from "@/modules/api/private/auth/reset";
import apiPublicAuthLogin from "@/modules/api/public/auth/login";
import apiPublicAuthRecovery from "@/modules/api/public/auth/recovery";
import apiPublicAuthReset from "@/modules/api/public/auth/reset";
import apiPublicGoogleCallback from "@/modules/api/public/google/callback";
import apiPublicGoogleLogin from "@/modules/api/public/google/login";
import apiPublicGoogleMe from "@/modules/api/public/google/me";
import apiPublicUser from "@/modules/api/public/user";

const endpoint = Router();

endpoint.use("/api/private/auth/code", apiPrivateAuthCode);
endpoint.use("/api/private/auth/confirm", apiPrivateAuthConfirm);
endpoint.use("/api/private/auth/hidrate", apiPrivateAuthHidrate);
endpoint.use("/api/private/auth/need_reset", apiPrivateAuthNeedReset);
endpoint.use("/api/private/auth/reset", apiPrivateAuthReset);
endpoint.use("/api/public/auth/login", apiPublicAuthLogin);
endpoint.use("/api/public/auth/recovery", apiPublicAuthRecovery);
endpoint.use("/api/public/auth/reset", apiPublicAuthReset);
endpoint.use("/api/public/google/callback", apiPublicGoogleCallback);
endpoint.use("/api/public/google/login", apiPublicGoogleLogin);
endpoint.use("/api/public/google/me", apiPublicGoogleMe);
endpoint.use("/api/public/user", apiPublicUser);

export default endpoint;

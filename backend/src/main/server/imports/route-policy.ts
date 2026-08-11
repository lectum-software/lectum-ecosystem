export type PrivateRoleGuard = "paciente" | "psicologo";

export type MountedRoutePolicyRecord = {
  adminProtected?: boolean;
  authOnly?: boolean;
  path: string;
  role?: PrivateRoleGuard;
};

const userAuthOnlyPrivateRoutes = [
  "/api/private/user/favorites",
  "/api/private/user/reviews",
] as const;

export const isUserAuthOnlyPrivateRoute = (path: string) =>
  userAuthOnlyPrivateRoutes.some((route) => route === path);

export const getExpectedPrivateRole = (path: string): PrivateRoleGuard | null => {
  if (path.startsWith("/api/private/patient/")) return "paciente";
  if (path.startsWith("/api/private/psychologist/")) return "psicologo";

  return null;
};

export const listPrivateRoutePolicyViolations = (routes: readonly MountedRoutePolicyRecord[]) => {
  const roleGuardViolations = routes.filter((route) => {
    const expectedRole = getExpectedPrivateRole(route.path);

    return Boolean(expectedRole && route.role !== expectedRole);
  });

  const userAuthOnlyViolations = routes.filter(
    (route) => isUserAuthOnlyPrivateRoute(route.path) && !route.authOnly,
  );

  const unprotectedAdminRoutes = routes.filter(
    (route) => route.path.startsWith("/api/admin/private/") && !route.adminProtected,
  );

  return {
    roleGuardViolations,
    unprotectedAdminRoutes,
    userAuthOnlyViolations,
  };
};

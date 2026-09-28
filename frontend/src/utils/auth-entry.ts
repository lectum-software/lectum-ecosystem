export const isAuthEntryPath = (pathname: string) =>
  [
    "/auth/login",
    "/auth/profile-selection",
    "/auth/register/patient",
    "/auth/register/psychologist",
  ].includes(pathname.replace(/\/$/, ""));

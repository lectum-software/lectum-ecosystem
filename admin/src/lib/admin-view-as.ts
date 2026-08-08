import { publicFrontendUrl } from "@/lib/public-frontend-url";

type AdminViewAsResponse = {
  mode: string;
  read_only: boolean;
  start_path: string;
  target: {
    id: string;
    name: string;
    role: string;
  };
  token: string;
  token_expires_in_seconds: number;
};

export const adminViewAsPopupBlockedMessage =
  "O navegador bloqueou a nova aba. Permita pop-ups para o Lectum Admin e tente novamente.";

export const buildAdminViewAsUrl = (session: AdminViewAsResponse) => {
  const url = new URL("/auth/admin-view-as", publicFrontendUrl);
  const adminReturnUrl = `${window.location.origin}${window.location.pathname}${window.location.search}`;
  const hash = new URLSearchParams({
    adminReturnUrl,
    expiresIn: String(session.token_expires_in_seconds),
    mode: session.mode,
    readOnly: String(session.read_only),
    role: session.target.role,
    startPath: session.start_path,
    subjectId: session.target.id,
    subjectName: session.target.name,
    token: session.token,
  });

  url.hash = hash.toString();

  return url.toString();
};

export const openPendingAdminViewAsTab = () => {
  const tab = window.open("about:blank", "_blank");
  if (!tab) return null;

  tab.opener = null;
  tab.document.title = "Preparando visualização administrativa";
  tab.document.body.style.margin = "0";
  tab.document.body.style.fontFamily =
    "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  tab.document.body.style.padding = "24px";
  tab.document.body.style.color = getComputedStyle(document.documentElement)
    .getPropertyValue("--admin-foreground")
    .trim();
  tab.document.body.textContent =
    "Preparando visualização administrativa em modo somente leitura...";

  return tab;
};

// One identity per consented page visit, retained across polling/effect restarts.
// Returning to an earlier route is a new visit; private routes reset the visit.
export function createPixelNavigation(newId: () => string) {
  let current: { scope: string; pathname: string; eventId: string } | null = null;
  return {
    reset() {
      current = null;
    },
    visit(scope: string, pathname: string) {
      if (!current || current.scope !== scope || current.pathname !== pathname)
        current = { scope, pathname, eventId: newId() };
      return current.eventId;
    },
  };
}

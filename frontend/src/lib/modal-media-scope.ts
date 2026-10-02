export const MODAL_MEDIA_SUSPENSION_ATTRIBUTE = "data-lectum-modal-media-suspended";

const modalRoots = new WeakMap<Document, Map<symbol, HTMLElement | null>>();

export const registerModalMediaRoot = (targetDocument: Document, root: HTMLElement | null) => {
  let roots = modalRoots.get(targetDocument);
  if (!roots) {
    roots = new Map();
    modalRoots.set(targetDocument, roots);
  }
  const owner = Symbol();
  roots.set(owner, root);
  return () => {
    if (!roots.delete(owner)) return;
    if (roots.size === 0) modalRoots.delete(targetDocument);
  };
};

export const isVideoBlockedByModal = (video: HTMLVideoElement) => {
  const targetDocument = video.ownerDocument;
  if (targetDocument?.documentElement.getAttribute(MODAL_MEDIA_SUSPENSION_ATTRIBUTE) !== "true") {
    return false;
  }

  // Only media belonging to the topmost modal may play, including its upload preview.
  const roots = modalRoots.get(targetDocument);
  const activeRoot = roots ? Array.from(roots.values()).at(-1) : null;
  return !activeRoot?.contains(video);
};

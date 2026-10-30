/** The outer native modal owns scroll for nested creation; standalone sheets own it here. */
export const lockCreatePostDocumentScroll = (scrollManagedExternally = false) => {
  if (scrollManagedExternally) return () => {};

  const lockedScrollX = window.scrollX;
  const lockedScrollY = window.scrollY;
  const previousBodyStyle = {
    overflow: document.body.style.overflow,
    position: document.body.style.position,
    top: document.body.style.top,
    right: document.body.style.right,
    left: document.body.style.left,
    width: document.body.style.width,
    overscrollBehavior: document.body.style.overscrollBehavior,
  };
  const previousDocumentStyle = {
    overflow: document.documentElement.style.overflow,
    overscrollBehavior: document.documentElement.style.overscrollBehavior,
  };
  Object.assign(document.body.style, {
    overflow: "hidden",
    position: "fixed",
    top: `-${lockedScrollY}px`,
    right: "0",
    left: "0",
    width: "100%",
    overscrollBehavior: "none",
  });
  Object.assign(document.documentElement.style, { overflow: "hidden", overscrollBehavior: "none" });

  return () => {
    Object.assign(document.body.style, previousBodyStyle);
    Object.assign(document.documentElement.style, previousDocumentStyle);
    window.scrollTo(lockedScrollX, lockedScrollY);
  };
};

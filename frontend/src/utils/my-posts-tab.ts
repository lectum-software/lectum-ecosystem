export const resolveMyPostsTab = (
  value: string | null,
  isPsychologist: boolean,
): "posts" | "replies" =>
  value === "posts" || value === "replies" ? value : isPsychologist ? "replies" : "posts";

export const myPostsTabHref = (pathname: string, search: string, value: "posts" | "replies") => {
  const params = new URLSearchParams(search);
  params.set("type", value);
  return `${pathname}?${params.toString()}`;
};

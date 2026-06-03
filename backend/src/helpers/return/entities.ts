const entities = {
  c: "Client",
  d: "Development",
  s: "Server",
};

export type Entity = keyof typeof entities;
export default entities;

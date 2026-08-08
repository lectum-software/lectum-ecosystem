//Socket

//Utils
import { clients } from "@/main/socket/clients";
import { soc } from "@/main/socket/state";

export const notification = async (ids: string[]) => {
  const { clientToEmit } = clients(ids);

  soc?.to(clientToEmit).emit("notification");
};

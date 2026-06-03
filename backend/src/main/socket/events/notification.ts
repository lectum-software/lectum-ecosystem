//Socket
import { soc } from "@/main/socket";

//Utils
import { clients } from "@/main/socket/clients";

export const notification = async (ids: string[]) => {
  const { clientToEmit } = clients(ids);

  soc?.to(clientToEmit).emit("notification");
};

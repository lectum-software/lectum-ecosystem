type ConnectedClient = {
  data?: {
    device_id?: string;
    id?: string;
  };
  socket: {
    id: string;
  };
};

export const connectedClients = new Map<string, ConnectedClient>();

//Socket
import { clients as cls } from ".";

export const clients = (usr: string[]) => {
  const clientToEmit: string[] = [];
  const out: { id: string; device_id?: string }[] = [];
  const enter: string[] = [];

  const cls_ids: string[] = [];
  cls.forEach((client) => {
    const id = client?.data?.id;
    if (id) cls_ids.push(id);
  });

  usr.forEach((user) => {
    const include = cls_ids.includes(user);
    include ? enter.push(user) : out.push({ id: user });
    cls.forEach((client) => {
      if (client?.data?.id === user) clientToEmit.push(client.socket.id);
    });
  });

  return { clientToEmit, out, enter };
};

export const devices = (socketId: string) => {
  const devices: string[] = [];
  cls.forEach((client) => {
    const deviceId = client?.data?.device_id;
    if (client?.socket.id === socketId && deviceId) devices.push(deviceId);
  });

  return devices[0];
};

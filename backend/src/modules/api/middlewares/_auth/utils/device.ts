/* eslint-disable @typescript-eslint/no-explicit-any */

export const getDevice = (data: any): { err?: string; id: string } => {
  const device_id = data?.headers?.["x-device"];
  if (!device_id) return { err: "device_not_found", id: "" };
  return { id: device_id };
};

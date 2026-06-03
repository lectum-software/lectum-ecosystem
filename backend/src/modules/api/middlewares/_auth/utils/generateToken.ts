import { createId } from "@paralleldrive/cuid2";
import jwt from "jsonwebtoken";

export const generateToken = (
  data: { id: string; email: string },
  type: string,
  device_id: string,
) => {
  const randomId = createId();

  const options = {
    id: data.id,
    email: data.email,
    type,
    randomId,
    device_id,
  };

  return jwt.sign(options, process.env.JWT_SECRET_KEY as string);
};

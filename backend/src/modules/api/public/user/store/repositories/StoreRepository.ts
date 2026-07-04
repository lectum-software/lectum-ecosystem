//Client
import type { Prisma } from "@/external/generated/prisma/client";
import prisma, { type ORM } from "@/infra/database/prisma";
//Objects
import type { user } from "@/interfaces/objects";

//Utils
import { log } from "@/utils/logs";
import { sanitizeSensitiveData } from "@/utils/sanitize-sensitive";
//DTOs
import type { IHasDTO, IStoreDTO } from "../DTOs/IStoreDTO";
import type { IStoreRepository } from "./interfaces/IStoreRepository";

export class StoreRepository implements IStoreRepository {
  readonly repository: ORM["user"];

  constructor() {
    this.repository = prisma.user;
  }

  async has(props: IHasDTO): Promise<user | null> {
    const args: Prisma.userFindFirstArgs = {
      where: props.where,
    };

    if (props.select) args.select = props.select;
    else if (props.include) args.include = props.include;

    const res = await this.repository.findFirst(args);

    return res as user | null;
  }

  async store(props: IStoreDTO): Promise<user> {
    const read: Pick<Prisma.userCreateArgs, "select" | "include"> = {};
    if (props.select) read.select = props.select;
    else if (props.include) read.include = props.include;

    const created = await prisma.$transaction(async (tx) => {
      const { terms_accepted, terms_version, ...userData } = props.b;
      const role = userData.role || "paciente";

      const item = await tx.user.create({
        data: {
          ...userData,
          role,
        },
        ...read,
      });

      if (role === "paciente") {
        await tx.patient_profile.create({
          data: {
            user_id: item.id,
          },
        });
      }

      if (role === "psicologo") {
        await tx.psychologist_profile.create({
          data: {
            user_id: item.id,
            crp_status: "pendente",
            published: false,
          },
        });
      }

      if (terms_accepted) {
        await tx.user_background.create({
          data: {
            user_id: item.id,
            type: "terms_accept",
            device_id: props.device_id,
            data: {
              accepted_at: new Date().toISOString(),
              terms_version: terms_version || "pending-legal-copy",
              source: role === "psicologo" ? "psychologist_registration" : "patient_registration",
              role,
            },
          },
        });
      }

      const newItem = {
        ...item,
      };

      await tx.log__user.create({
        data: {
          action: log.store,
          ref_id: item.id,
          new: JSON.stringify(sanitizeSensitiveData(newItem, { removeAuthTokens: true })),
        },
      });

      return item;
    });

    return created as user;
  }
}

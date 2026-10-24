import prisma from "@/infra/database/prisma";
import { fiscalCpf, getFiscalIdentity } from "@/modules/billing/invoices/fiscal-identity";
import cpfSchema from "@/packages/validator/schema/_internal/validations/functions/cpf";
import { withSerializableTransaction } from "@/utils/prisma-transaction";

export class FiscalIdentityRepository {
  async read(profileId: string) {
    const profile = await prisma.psychologist_profile.findFirst({
      where: { id: profileId, deleted: false },
    });
    if (!profile) return null;
    const events = await prisma.fiscal_identity_event.findMany({
      where: { psychologist_id: profileId },
      orderBy: { sequence: "desc" },
      take: 10,
    });
    const actors = await prisma.admin.findMany({
      where: { id: { in: events.flatMap((event) => (event.actor_id ? [event.actor_id] : [])) } },
      select: { id: true, name: true },
    });
    return {
      current: await getFiscalIdentity(profile),
      revision: events[0]?.id ?? null,
      profile_revision: profile.updatedAt.toISOString(),
      history: events.map((event) => ({
        id: event.id,
        full_name: event.full_name,
        source: event.source,
        created_at: event.created_at,
        actor_id: event.actor_id,
        actor_name: actors.find((actor) => actor.id === event.actor_id)?.name ?? null,
      })),
    };
  }

  async save(
    profileId: string,
    input: {
      full_name: string;
      revision: string | null;
      profile_revision: string;
    },
    actorId: string,
  ) {
    return withSerializableTransaction(async (tx) => {
      const profile = await tx.psychologist_profile.findFirst({
        where: { id: profileId, deleted: false },
      });
      if (!profile) return "changed";
      const latest = await tx.fiscal_identity_event.findFirst({
        where: { psychologist_id: profileId },
        orderBy: { sequence: "desc" },
      });
      if ((latest?.id ?? null) !== input.revision) return "changed";
      const cpf = fiscalCpf(profile.cpf);
      const formattedCpf = cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
      if (!cpf || !cpfSchema({ key: "cpf" }).safeParse(formattedCpf).success) return "cpf_missing";
      // Lock the same profile row as CFP/manual registry decisions before appending an event.
      const locked = await tx.psychologist_profile.updateMany({
        where: {
          id: profileId,
          deleted: false,
          updatedAt: new Date(input.profile_revision),
          user: { active: true, deleted: false, role: "psicologo" },
        },
        data: { updatedAt: new Date() },
      });
      if (locked.count !== 1) return "changed";
      if (latest?.full_name === input.full_name && latest.cpf === cpf) return "saved";
      await tx.fiscal_identity_event.create({
        data: {
          psychologist_id: profileId,
          full_name: input.full_name,
          cpf,
          source: "manual_admin",
          actor_id: actorId,
        },
      });
      return "saved";
    });
  }
}

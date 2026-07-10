import prisma from "@/infra/database/prisma";
import { parseCrpRegistrationDate } from "@/utils/professional-experience";

const SOURCE_ADMIN_GRANT = "admin_grant";

export type GrantProfessionalSubscriptionArgs = {
  actor: string;
  cpf?: string | null;
  crpNumber?: string | null;
  crpRegion?: string | null;
  days?: number;
  notes?: string;
  psychologistEmail?: string;
  psychologistProfileId?: string;
  psychologistUserId?: string;
  registrationDate?: Date;
  until?: Date;
};

export type GrantProfessionalSubscriptionTarget = {
  email: string;
  name: string;
  profileId: string;
  userId: string;
};

const trimToNull = (value?: string | null) => {
  const normalized = value?.trim();
  return normalized || null;
};

const onlyDigits = (value?: string | null) => String(value ?? "").replace(/\D/g, "");

const normalizeCpfForOverride = (value?: string | null) => {
  if (value === undefined) return undefined;

  const digits = onlyDigits(value);
  if (!digits) return null;

  const calcDigit = (base: string, factor: number) => {
    const sum = base
      .split("")
      .reduce((total, digit, index) => total + Number(digit) * (factor - index), 0);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  const isValid =
    digits.length === 11 &&
    !/^(\d)\1+$/.test(digits) &&
    calcDigit(digits.slice(0, 9), 10) === Number(digits[9]) &&
    calcDigit(digits.slice(0, 10), 11) === Number(digits[10]);

  if (!isValid) {
    throw new Error("cpf_invalid");
  }

  return digits;
};

const buildCrp = (region?: string | null, number?: string | null) => {
  const normalizedRegion = trimToNull(region);
  const normalizedNumber = trimToNull(number);

  if (normalizedRegion && normalizedNumber) return `${normalizedRegion}/${normalizedNumber}`;
  return normalizedRegion || normalizedNumber || null;
};

const normalizeIdentityOverride = (args: GrantProfessionalSubscriptionArgs) => {
  const hasCpfOverride = args.cpf !== undefined;
  const hasCrpOverride = args.crpRegion !== undefined || args.crpNumber !== undefined;

  if (!hasCpfOverride && !hasCrpOverride) return null;

  return {
    cpf: normalizeCpfForOverride(args.cpf),
    crp: hasCrpOverride ? buildCrp(args.crpRegion, args.crpNumber) : undefined,
    crpNumber: hasCrpOverride ? trimToNull(args.crpNumber) : undefined,
    crpRegion: hasCrpOverride ? trimToNull(args.crpRegion) : undefined,
    hasCpfOverride,
    hasCrpOverride,
  };
};

export const parseGrantCrpRegistrationDate = (value: string) => {
  const date = parseCrpRegistrationDate(value, {
    allowFuture: true,
  });

  if (!date) {
    throw new Error("crp_registration_date_invalid");
  }

  if (date > new Date()) {
    throw new Error("crp_registration_date_future");
  }

  return date;
};

export const resolveGrantPeriodEnd = (args: GrantProfessionalSubscriptionArgs) => {
  const now = new Date();
  const periodEnd = args.until ?? new Date(now.getTime() + Number(args.days) * 24 * 60 * 60 * 1000);

  if (periodEnd <= now) {
    throw new Error("courtesy_period_must_end_in_future");
  }

  return periodEnd;
};

const assertSingleTarget = (args: GrantProfessionalSubscriptionArgs) => {
  const targets = [args.psychologistEmail, args.psychologistProfileId, args.psychologistUserId]
    .map((value) => value?.trim())
    .filter(Boolean);

  if (targets.length !== 1) {
    throw new Error("grant_target_must_be_unique");
  }
};

const assertAudit = (args: GrantProfessionalSubscriptionArgs) => {
  if (!args.actor?.trim()) {
    throw new Error("grant_actor_required");
  }

  if (!args.days && !args.until) {
    throw new Error("grant_period_required");
  }

  if (args.days && (!Number.isInteger(args.days) || args.days <= 0)) {
    throw new Error("grant_days_invalid");
  }

  if (args.days && args.until) {
    throw new Error("grant_period_must_be_unique");
  }

  assertSingleTarget(args);
};

const findTarget = async (
  args: GrantProfessionalSubscriptionArgs,
): Promise<GrantProfessionalSubscriptionTarget> => {
  if (args.psychologistProfileId) {
    const profile = await prisma.psychologist_profile.findFirst({
      where: {
        id: args.psychologistProfileId,
        deleted: false,
        user: {
          active: true,
          deleted: false,
          role: "psicologo",
        },
      },
      select: {
        id: true,
        user: {
          select: {
            email: true,
            id: true,
            name: true,
          },
        },
      },
    });

    if (!profile) {
      throw new Error("psychologist_profile_not_found_for_grant");
    }

    return {
      email: profile.user.email,
      name: profile.user.name,
      profileId: profile.id,
      userId: profile.user.id,
    };
  }

  const user = await prisma.user.findFirst({
    where: {
      ...(args.psychologistEmail ? { email: args.psychologistEmail } : {}),
      ...(args.psychologistUserId ? { id: args.psychologistUserId } : {}),
      active: true,
      deleted: false,
      role: "psicologo",
    },
    select: {
      email: true,
      id: true,
      name: true,
      psychologist_profile: {
        select: {
          deleted: true,
          id: true,
        },
      },
    },
  });

  if (!user?.psychologist_profile || user.psychologist_profile.deleted) {
    throw new Error("psychologist_user_not_found_for_grant");
  }

  return {
    email: user.email,
    name: user.name,
    profileId: user.psychologist_profile.id,
    userId: user.id,
  };
};

export const grantProfessionalSubscription = async (args: GrantProfessionalSubscriptionArgs) => {
  assertAudit(args);

  const target = await findTarget(args);
  const periodEnd = resolveGrantPeriodEnd(args);
  const identityOverride = normalizeIdentityOverride(args);
  const professionalPlan = await prisma.subscription_plan.findFirst({
    where: {
      active: true,
      deleted: false,
      slug: "profissional",
    },
  });

  if (!professionalPlan) {
    throw new Error("professional_plan_not_found");
  }

  const now = new Date();
  const subscription = await prisma.$transaction(async (tx) => {
    const externalBillingSubscription = await tx.professional_subscription.findFirst({
      where: {
        deleted: false,
        psychologist_id: target.profileId,
        status: {
          not: "cancelada",
        },
        OR: [
          {
            source: "mercadopago",
          },
          {
            gateway: {
              not: null,
            },
          },
          {
            gateway_subscription_id: {
              not: null,
            },
          },
        ],
      },
      select: {
        gateway: true,
        gateway_subscription_id: true,
        id: true,
        source: true,
        status: true,
      },
    });

    if (externalBillingSubscription) {
      throw new Error("external_billing_subscription_blocks_admin_grant");
    }

    await tx.professional_subscription.updateMany({
      where: {
        deleted: false,
        psychologist_id: target.profileId,
        status: {
          not: "cancelada",
        },
      },
      data: {
        status: "cancelada",
      },
    });

    const profileUpdateData: {
      cpf?: string | null;
      crp?: string | null;
      crp_registration_date?: Date;
    } = {};

    if (args.registrationDate) {
      profileUpdateData.crp_registration_date = args.registrationDate;
    }

    if (identityOverride?.hasCpfOverride) {
      profileUpdateData.cpf = identityOverride.cpf ?? null;
    }

    if (identityOverride?.hasCrpOverride) {
      profileUpdateData.crp = identityOverride.crp ?? null;
    }

    if (Object.keys(profileUpdateData).length > 0) {
      await tx.psychologist_profile.update({
        where: {
          id: target.profileId,
        },
        data: profileUpdateData,
      });
    }

    return tx.professional_subscription.create({
      data: {
        current_period_end: periodEnd,
        gateway: null,
        gateway_subscription_id: null,
        grant_notes: args.notes?.trim() || null,
        grant_reason: null,
        grant_started_at: now,
        granted_by: args.actor.trim(),
        plan_id: professionalPlan.id,
        psychologist_id: target.profileId,
        source: SOURCE_ADMIN_GRANT,
        status: "ativa",
      },
      include: {
        plan: true,
      },
    });
  });

  return {
    crp_registration_date: args.registrationDate ?? null,
    granted_to: target,
    identity_override: identityOverride
      ? {
          cpf: identityOverride.hasCpfOverride ? (identityOverride.cpf ?? null) : null,
          crp: identityOverride.hasCrpOverride ? (identityOverride.crp ?? null) : null,
          crp_number: identityOverride.hasCrpOverride ? (identityOverride.crpNumber ?? null) : null,
          crp_region: identityOverride.hasCrpOverride ? (identityOverride.crpRegion ?? null) : null,
        }
      : null,
    subscription: {
      id: subscription.id,
      current_period_end: subscription.current_period_end,
      plan: {
        id: subscription.plan.id,
        name: subscription.plan.name,
        slug: subscription.plan.slug,
      },
      source: subscription.source,
      status: subscription.status,
    },
  };
};

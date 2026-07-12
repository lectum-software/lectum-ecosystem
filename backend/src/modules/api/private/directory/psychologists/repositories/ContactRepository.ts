import { parsePhoneNumberFromString } from "libphonenumber-js";
import prisma from "@/infra/database/prisma";
import {
  buildProfessionalFullDisplayName,
  getProfessionalWhatsappDisplayName,
} from "@/utils/professional-name";
import { buildLectumWhatsappUrl } from "@/utils/whatsapp-contact";
import type {
  DirectoryPsychologistContactResponse,
  IContactClickDTO,
  IContactDTO,
} from "../DTOs/IContactDTO";
import type { IContactRepository } from "./interfaces/IContactRepository";

type ContactError = "not_found" | "patient_phone_invalid" | "whatsapp_unavailable";

export type ContactRepositoryResult =
  | {
      ok: true;
      data: DirectoryPsychologistContactResponse;
    }
  | {
      ok: false;
      reason: ContactError;
    };

const normalizePhone = (value: string) => {
  const parsed = parsePhoneNumberFromString(value, "BR");

  if (!parsed?.isValid()) return null;

  return parsed.number;
};

const toWhatsAppUrl = (
  phone: string,
  psychologistName?: string | null,
  psychologistWhatsappName?: string | null,
) =>
  buildLectumWhatsappUrl({
    phone,
    psychologistName,
    psychologistWhatsappName,
    source: "profile",
  });

const isSelfProfessionalAction = (authId: string | null | undefined, psychologistId: string) =>
  Boolean(authId && authId === psychologistId);

const toContactResponse = (
  psychologist: {
    id: string;
    name: string | null;
    psychologist_profile?: {
      professional_first_name?: string | null;
      professional_last_name?: string | null;
    } | null;
  },
  psychologistPhone: string,
  contactRequestId: string | null,
): DirectoryPsychologistContactResponse => {
  const displayName = buildProfessionalFullDisplayName({
    fallbackName: psychologist.name,
    firstName: psychologist.psychologist_profile?.professional_first_name,
    lastName: psychologist.psychologist_profile?.professional_last_name,
  });
  const whatsappDisplayName = getProfessionalWhatsappDisplayName({
    fallbackName: displayName,
    firstName: psychologist.psychologist_profile?.professional_first_name,
  });

  return {
    contact_request_id: contactRequestId,
    psychologist_id: psychologist.id,
    tracked: Boolean(contactRequestId),
    whatsapp_url: toWhatsAppUrl(psychologistPhone, displayName, whatsappDisplayName) ?? "",
  };
};

export class ContactRepository implements IContactRepository {
  async registerClick(data: IContactClickDTO): Promise<ContactRepositoryResult> {
    const psychologist = await prisma.user.findFirst({
      where: {
        id: data.p.id,
        role: "psicologo",
        active: true,
        deleted: false,
        psychologist_profile: {
          is: {
            published: true,
            deleted: false,
            video_url: {
              not: null,
            },
            NOT: [
              {
                video_url: "",
              },
            ],
          },
        },
      },
      select: {
        id: true,
        name: true,
        psychologist_profile: {
          select: {
            professional_first_name: true,
            professional_last_name: true,
            whatsapp: true,
          },
        },
      },
    });

    const profile = psychologist?.psychologist_profile;

    if (!psychologist || !profile) {
      return {
        ok: false,
        reason: "not_found",
      };
    }

    if (!profile.whatsapp) {
      return {
        ok: false,
        reason: "whatsapp_unavailable",
      };
    }

    const psychologistPhone = normalizePhone(profile.whatsapp);

    if (!psychologistPhone) {
      return {
        ok: false,
        reason: "whatsapp_unavailable",
      };
    }

    const actorId = data.auth?.id ?? null;

    if (isSelfProfessionalAction(actorId, psychologist.id)) {
      return {
        ok: true,
        data: toContactResponse(psychologist, psychologistPhone, null),
      };
    }

    const contact = await prisma.contact_request.create({
      data: {
        user_id: actorId,
        psychologist_id: psychologist.id,
        channel: "whatsapp",
      },
      select: {
        id: true,
      },
    });

    return {
      ok: true,
      data: toContactResponse(psychologist, psychologistPhone, contact.id),
    };
  }

  async create(data: IContactDTO): Promise<ContactRepositoryResult> {
    const patientPhone = normalizePhone(data.b.patient_phone);

    if (!patientPhone) {
      return {
        ok: false,
        reason: "patient_phone_invalid",
      };
    }

    const psychologist = await prisma.user.findFirst({
      where: {
        id: data.p.id,
        role: "psicologo",
        active: true,
        deleted: false,
        psychologist_profile: {
          is: {
            published: true,
            deleted: false,
            video_url: {
              not: null,
            },
            NOT: [
              {
                video_url: "",
              },
            ],
          },
        },
      },
      select: {
        id: true,
        name: true,
        psychologist_profile: {
          select: {
            professional_first_name: true,
            professional_last_name: true,
            whatsapp: true,
          },
        },
      },
    });

    const profile = psychologist?.psychologist_profile;

    if (!psychologist || !profile) {
      return {
        ok: false,
        reason: "not_found",
      };
    }

    if (!profile.whatsapp) {
      return {
        ok: false,
        reason: "whatsapp_unavailable",
      };
    }

    const psychologistPhone = normalizePhone(profile.whatsapp);

    if (!psychologistPhone) {
      return {
        ok: false,
        reason: "whatsapp_unavailable",
      };
    }

    const actorId = data.auth?.id ?? null;

    if (isSelfProfessionalAction(actorId, psychologist.id)) {
      return {
        ok: true,
        data: toContactResponse(psychologist, psychologistPhone, null),
      };
    }

    const contact = await prisma.$transaction(async (tx) => {
      if (data.auth?.role === "paciente" && actorId) {
        await tx.patient_profile.updateMany({
          where: {
            user_id: actorId,
            deleted: false,
          },
          data: {
            phone: patientPhone,
          },
        });
      }

      return tx.contact_request.create({
        data: {
          user_id: actorId,
          psychologist_id: psychologist.id,
          channel: "whatsapp",
        },
        select: {
          id: true,
        },
      });
    });

    return {
      ok: true,
      data: toContactResponse(psychologist, psychologistPhone, contact.id),
    };
  }
}

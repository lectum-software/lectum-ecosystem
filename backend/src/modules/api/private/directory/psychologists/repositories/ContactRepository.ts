import { parsePhoneNumberFromString } from "libphonenumber-js";
import prisma from "@/infra/database/prisma";
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

const toWhatsAppUrl = (phone: string, psychologistName?: string | null) =>
  buildLectumWhatsappUrl({ phone, psychologistName, source: "profile" });

const isSelfProfessionalAction = (authId: string | null | undefined, psychologistId: string) =>
  Boolean(authId && authId === psychologistId);

const toContactResponse = (
  psychologist: { id: string; name: string | null },
  psychologistPhone: string,
  contactRequestId: string | null,
): DirectoryPsychologistContactResponse => ({
  contact_request_id: contactRequestId,
  psychologist_id: psychologist.id,
  tracked: Boolean(contactRequestId),
  whatsapp_url: toWhatsAppUrl(psychologistPhone, psychologist.name) ?? "",
});

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

    if (isSelfProfessionalAction(data.auth.id, psychologist.id)) {
      return {
        ok: true,
        data: toContactResponse(psychologist, psychologistPhone, null),
      };
    }

    const contact = await prisma.contact_request.create({
      data: {
        user_id: data.auth.id,
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

    if (isSelfProfessionalAction(data.auth.id, psychologist.id)) {
      return {
        ok: true,
        data: toContactResponse(psychologist, psychologistPhone, null),
      };
    }

    const contact = await prisma.$transaction(async (tx) => {
      if (data.auth.role === "paciente" && data.auth.id) {
        await tx.patient_profile.updateMany({
          where: {
            user_id: data.auth.id,
            deleted: false,
          },
          data: {
            phone: patientPhone,
          },
        });
      }

      return tx.contact_request.create({
        data: {
          user_id: data.auth.id,
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

import { parsePhoneNumberFromString } from "libphonenumber-js";
import prisma from "@/infra/database/prisma";
import type { DirectoryPsychologistContactResponse, IContactDTO } from "../DTOs/IContactDTO";
import type { IContactRepository } from "./interfaces/IContactRepository";

const CONTACT_MESSAGE =
  "Olá, encontrei seu perfil na Lectum e gostaria de conversar sobre atendimento.";

type ContactError =
  | "not_found"
  | "patient_phone_invalid"
  | "whatsapp_unavailable"
  | "whatsapp_not_verified";

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

const toWhatsAppUrl = (phone: string) => {
  const digits = phone.replace(/\D/g, "");
  const text = encodeURIComponent(CONTACT_MESSAGE);

  return `https://wa.me/${digits}?text=${text}`;
};

export class ContactRepository implements IContactRepository {
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
          },
        },
      },
      select: {
        id: true,
        psychologist_profile: {
          select: {
            whatsapp: true,
            whatsapp_verified_at: true,
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

    if (!profile.whatsapp_verified_at) {
      return {
        ok: false,
        reason: "whatsapp_not_verified",
      };
    }

    const psychologistPhone = normalizePhone(profile.whatsapp);

    if (!psychologistPhone) {
      return {
        ok: false,
        reason: "whatsapp_unavailable",
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
      data: {
        contact_request_id: contact.id,
        psychologist_id: psychologist.id,
        whatsapp_url: toWhatsAppUrl(psychologistPhone),
      },
    };
  }
}

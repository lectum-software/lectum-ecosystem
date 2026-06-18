import { error, msg } from "@/helpers/translate";
import { notifyWhatsappClick } from "@/main/notification/domain-events";
import type { IContactClickDTO, IContactDTO } from "../DTOs/IContactDTO";
import type { IIndexDTO } from "../DTOs/IIndexDTO";
import type { IProfileListDTO, IProfileShowDTO } from "../DTOs/IProfileDTO";
import type { IProfileVideoWatchDTO } from "../DTOs/IProfileVideoWatchDTO";
import { ContactRepository } from "../repositories/ContactRepository";
import { IndexRepository } from "../repositories/IndexRepository";
import { ProfileRepository } from "../repositories/ProfileRepository";
import { ProfileVideoWatchRepository } from "../repositories/ProfileVideoWatchRepository";

export default async (data: IIndexDTO) => {
  const repository = new IndexRepository();
  const res = await repository.index(data);

  return {
    status: 200,
    ...msg("index", {}),
    data: res,
  };
};

export const show = async (data: IProfileShowDTO) => {
  const repository = new ProfileRepository();
  const res = await repository.show(data);

  if (!res) {
    return {
      status: 404,
      ...error("not_found", {
        model: "psychologist_profile",
      }),
    };
  }

  return {
    status: 200,
    ...msg("show", {}),
    data: res,
  };
};

export const posts = async (data: IProfileListDTO) => {
  const repository = new ProfileRepository();
  const exists = await repository.hasPublishedProfile(data.p.id);

  if (!exists) {
    return {
      status: 404,
      ...error("not_found", {
        model: "psychologist_profile",
      }),
    };
  }

  const res = await repository.posts(data);

  return {
    status: 200,
    ...msg("index", {}),
    data: res,
  };
};

export const reviews = async (data: IProfileListDTO) => {
  const repository = new ProfileRepository();
  const exists = await repository.hasPublishedProfile(data.p.id);

  if (!exists) {
    return {
      status: 404,
      ...error("not_found", {
        model: "psychologist_profile",
      }),
    };
  }

  const res = await repository.reviews(data);

  return {
    status: 200,
    ...msg("index", {}),
    data: res,
  };
};

export const contact = async (data: IContactDTO) => {
  if (!data.b.consent_accepted) {
    return {
      status: 400,
      ...error("contact_consent_required", {}),
    };
  }

  const repository = new ContactRepository();
  const res = await repository.create(data);

  if (!res.ok) {
    if (res.reason === "not_found") {
      return {
        status: 404,
        ...error("not_found", {
          model: "psychologist_profile",
        }),
      };
    }

    const status = res.reason === "patient_phone_invalid" ? 400 : 403;

    return {
      status,
      ...error(res.reason, {}),
    };
  }

  await notifyWhatsappClick({
    actorId: data.auth.id,
    contactRequestId: res.data.contact_request_id,
    psychologistId: res.data.psychologist_id,
  });

  return {
    status: 200,
    ...msg("contact_success", {}),
    data: res.data,
  };
};

export const contactClick = async (data: IContactClickDTO) => {
  const repository = new ContactRepository();
  const res = await repository.registerClick(data);

  if (!res.ok) {
    if (res.reason === "not_found") {
      return {
        status: 404,
        ...error("not_found", {
          model: "psychologist_profile",
        }),
      };
    }

    return {
      status: 403,
      ...error(res.reason, {}),
    };
  }

  await notifyWhatsappClick({
    actorId: data.auth.id,
    contactRequestId: res.data.contact_request_id,
    psychologistId: res.data.psychologist_id,
  });

  return {
    status: 200,
    ...msg("contact_success", {}),
    data: res.data,
  };
};

export const videoWatch = async (data: IProfileVideoWatchDTO) => {
  const repository = new ProfileVideoWatchRepository();
  const res = await repository.track(data);

  if (!res.tracked && res.reason === "not_found") {
    return {
      status: 404,
      ...error("not_found", {
        model: "psychologist_profile",
      }),
    };
  }

  return {
    status: 200,
    ...msg("store", {}),
    data: {
      tracked: res.tracked,
    },
  };
};

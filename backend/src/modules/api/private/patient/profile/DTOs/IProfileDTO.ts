import type { patient_profile, user } from "@/interfaces/objects";

export interface IProfileDTO {
  auth: user;
}

export type PatientProfileGoal = "encontrar_psicologo" | "conhecer_comunidade";
export type PatientProfileGender = "feminino" | "masculino" | "nao_binario" | "prefiro_nao_dizer";
export type PatientProfileState =
  | "AC"
  | "AL"
  | "AP"
  | "AM"
  | "BA"
  | "CE"
  | "DF"
  | "ES"
  | "GO"
  | "MA"
  | "MT"
  | "MS"
  | "MG"
  | "PA"
  | "PB"
  | "PR"
  | "PE"
  | "PI"
  | "RJ"
  | "RN"
  | "RS"
  | "RO"
  | "RR"
  | "SC"
  | "SP"
  | "SE"
  | "TO";

export interface IUpdateProfileDTO extends IProfileDTO {
  b: {
    name: string;
    goal?: PatientProfileGoal | null;
    gender?: PatientProfileGender | null;
    birthdate?: Date | null;
    phone?: string | null;
    bio?: string | null;
    city?: string | null;
    state?: PatientProfileState | null;
  };
}

export type PatientPrivateProfileResponse = {
  user: Pick<user, "id" | "name" | "email" | "avatar" | "role" | "confirmed" | "provider"> & {
    patient_profile: patient_profile | null;
  };
  profile: patient_profile;
};

export type PatientProfileAvatarUploadResponse = {
  avatar_url: string;
  profile: PatientPrivateProfileResponse;
};

export type PatientProfileAvatarRemovalResponse = {
  profile: PatientPrivateProfileResponse;
};

export interface IUploadAvatarDTO extends IProfileDTO {
  file?: {
    path?: string;
    key?: string;
    fileUrl?: string;
    mimetype?: string;
  };
}

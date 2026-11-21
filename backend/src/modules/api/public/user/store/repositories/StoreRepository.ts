//Client
import type { Prisma } from "@/external/generated/prisma/client";
import prisma, { type ORM } from "@/infra/database/prisma";
//Objects
import type { user } from "@/interfaces/objects";
import {
  buildPatientSignupAnalyticsIdentityData,
  buildPsychologistSignupAnalyticsIdentityData,
  PATIENT_SIGNUP_ANALYTICS_IDENTITY_TYPE,
  PSYCHOLOGIST_SIGNUP_ANALYTICS_IDENTITY_TYPE,
  resolveSignupAnalyticsIdentity,
} from "@/modules/api/public/analytics/helpers/signup-identity";
import { acceptRegistrationLegal, assertAdultRegistration } from "@/modules/legal/registration";
import { registrationCommitted } from "@/modules/marketing/conversion-hooks";
import {
  claimUserEmailConsent,
  prepareUserOAuthConsent,
} from "@/modules/marketing/user-oauth-consent";
import { registrationBirthdate } from "@/utils/adult-birthdate";

//Utils
import { log } from "@/utils/logs";
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

    // Resolve existing guest evidence before account creation; never infer consent from terms.
    const marketingConsent =
      (props.b.role || "paciente") === "paciente"
        ? await prepareUserOAuthConsent(
            prisma,
            props.b.marketing_guest_token,
            new Date(),
            props.headers?.referer,
          )
        : null;
    const created = await prisma.$transaction(async (tx) => {
      const {
        professional_first_name,
        professional_last_name,
        password_confirm: _passwordConfirm,
        terms_accepted,
        legal_document_ids,
        privacy_acknowledged,
        promotional_authorized,
        adult_confirmed,
        birthdate,
        terms_version,
        analytics_session_id,
        analytics_visitor_id,
        measurement_allowed,
        marketing_guest_token: _marketingGuestToken,
        ...userData
      } = props.b;
      void _passwordConfirm;
      void _marketingGuestToken;
      const role = userData.role || "paciente";
      const dateOfBirth = registrationBirthdate(birthdate);
      await assertAdultRegistration(adult_confirmed, tx);
      const signupAnalyticsIdentity = resolveSignupAnalyticsIdentity({
        analytics_session_id,
        analytics_visitor_id,
        measurement_allowed: measurement_allowed,
        role,
      });

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
            birthdate: dateOfBirth,
          },
        });
      }

      if (role === "psicologo") {
        await tx.psychologist_profile.create({
          data: {
            user_id: item.id,
            professional_first_name,
            professional_last_name,
            birthdate: dateOfBirth,
            crp_status: "pendente",
            published: false,
          },
        });
      }

      if (role === "paciente" && signupAnalyticsIdentity) {
        await tx.user_background.create({
          data: {
            user_id: item.id,
            type: PATIENT_SIGNUP_ANALYTICS_IDENTITY_TYPE,
            device_id: props.device_id,
            data: buildPatientSignupAnalyticsIdentityData({
              identity: signupAnalyticsIdentity,
              source: "patient_registration",
            }),
          },
        });
      }

      if (role === "psicologo" && signupAnalyticsIdentity) {
        await tx.user_background.create({
          data: {
            user_id: item.id,
            type: PSYCHOLOGIST_SIGNUP_ANALYTICS_IDENTITY_TYPE,
            device_id: props.device_id,
            data: buildPsychologistSignupAnalyticsIdentityData({
              identity: signupAnalyticsIdentity,
              source: "psychologist_registration",
            }),
          },
        });
      }

      await acceptRegistrationLegal(tx, item.id, {
        legal_document_ids,
        terms_accepted,
        privacy_acknowledged,
        promotional_authorized,
        adult_confirmed,
      });
      if (adult_confirmed === true) {
        await tx.user_background.create({
          data: {
            user_id: item.id,
            type: "adult_declaration",
            data: {
              declared_at: new Date().toISOString(),
              minimum_age: 18,
              source: "registration",
            },
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

      await tx.log__user.create({
        data: {
          action: log.store,
          ref_id: item.id,
          new: JSON.stringify({
            active: item.active,
            confirmed: item.confirmed,
            need_reset: item.need_reset,
            provider: item.provider,
            role: item.role,
          }),
        },
      });

      if (role === "paciente" && marketingConsent) {
        await claimUserEmailConsent(tx, item.id, marketingConsent);
      }
      return item;
    });

    void registrationCommitted(created.role, () => created.id);
    return created as user;
  }
}

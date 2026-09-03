import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import { retireOwnedVideoAssetReference } from "@/modules/video-assets/lifecycle";
import type {
  FreeProfessionalProfileResponse,
  FreeProfessionalProfileUpdateBody,
} from "../DTOs/IFreeProfileDTO";
import type { IFreeProfileRepository } from "./interfaces/IFreeProfileRepository";

import {
  buildCrp,
  deletePublicProfileMedia,
  getUserWithProfile,
  toResponse,
} from "./support/profile-response";

const cleanupReplacedProfileVideo = async (
  ownerId: string,
  videoUrl?: string | null,
  videoCoverUrl?: string | null,
) => {
  await Promise.allSettled([
    deletePublicProfileMedia(videoUrl),
    deletePublicProfileMedia(videoCoverUrl),
    retireOwnedVideoAssetReference({
      ownerId,
      purpose: "profile_presentation",
      reference: videoUrl,
    }),
  ]);
};

export class FreeProfileRepository implements IFreeProfileRepository {
  async show(userId: string): Promise<FreeProfessionalProfileResponse | null> {
    const item = await getUserWithProfile(userId);
    if (!item) return null;
    return toResponse(item);
  }

  async update(
    userId: string,
    body: Required<FreeProfessionalProfileUpdateBody>,
    options: { canUploadVideo: boolean; lockIdentityFields?: boolean },
  ): Promise<FreeProfessionalProfileResponse | null> {
    const existing = await getUserWithProfile(userId);
    const profile = existing?.psychologist_profile;
    if (!existing || !profile) return null;

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { name: body.name },
      });

      await tx.psychologist_profile.update({
        where: { id: profile.id },
        data: {
          professional_first_name: body.professional_first_name,
          professional_last_name: body.professional_last_name,
          headline: body.headline,
          bio: body.bio,
          modality: body.modality,
          cpf: options.lockIdentityFields ? undefined : body.cpf,
          birthdate: body.birthdate,
          gender: body.gender,
          race_color: body.race_color,
          religion: body.religion,
          crp: options.lockIdentityFields ? undefined : buildCrp(body.crp_region, body.crp_number),
          whatsapp: body.whatsapp,
          languages: body.languages as Prisma.InputJsonValue,
          video_url: options.canUploadVideo ? undefined : null,
          video_cover_url: options.canUploadVideo ? undefined : null,
          target_audience: body.target_audience as Prisma.InputJsonValue,
          discount_first_session: body.discount_first_session,
          social_value: body.social_value,
          accepts_insurance: body.accepts_insurance,
          show_experience_tag: body.show_experience_tag,
          academic_title: body.academic.title,
          academic_institution: body.academic.institution,
          academic_graduation_year: body.academic.graduation_year,
          academic_formations: body.academic_formations as Prisma.InputJsonValue,
          available_days: body.available_days as Prisma.InputJsonValue,
          professional_address_street: body.address.street,
          professional_address_number: body.address.number,
          professional_address_complement: body.address.complement,
          professional_address_district: body.address.district,
          professional_address_zip: body.address.zip,
          professional_address_city: body.address.city,
          professional_address_state: body.address.state,
          published: body.published,
        },
      });

      const relationDeletedAt = new Date();

      await tx.psychologist_specialty.updateMany({
        where: {
          deleted: false,
          psychologist_id: userId,
          ...(body.specialty_ids.length > 0
            ? {
                specialty_id: {
                  notIn: body.specialty_ids,
                },
              }
            : {}),
        },
        data: {
          deleted: true,
          deletedAt: relationDeletedAt,
        },
      });
      for (const specialty_id of body.specialty_ids) {
        await tx.psychologist_specialty.upsert({
          where: {
            psychologist_id_specialty_id: {
              psychologist_id: userId,
              specialty_id,
            },
          },
          create: {
            psychologist_id: userId,
            specialty_id,
          },
          update: {
            deleted: false,
            deletedAt: null,
          },
        });
      }

      await tx.psychologist_service.updateMany({
        where: {
          deleted: false,
          psychologist_id: userId,
          ...(body.service_ids.length > 0
            ? {
                service_id: {
                  notIn: body.service_ids,
                },
              }
            : {}),
        },
        data: {
          deleted: true,
          deletedAt: relationDeletedAt,
        },
      });
      for (const service_id of body.service_ids) {
        await tx.psychologist_service.upsert({
          where: {
            psychologist_id_service_id: {
              psychologist_id: userId,
              service_id,
            },
          },
          create: {
            psychologist_id: userId,
            service_id,
          },
          update: {
            deleted: false,
            deletedAt: null,
          },
        });
      }

      await tx.psychologist_approach.updateMany({
        where: {
          deleted: false,
          psychologist_id: userId,
          ...(body.approach_ids.length > 0
            ? {
                approach_id: {
                  notIn: body.approach_ids,
                },
              }
            : {}),
        },
        data: {
          deleted: true,
          deletedAt: relationDeletedAt,
        },
      });
      for (const approach_id of body.approach_ids) {
        await tx.psychologist_approach.upsert({
          where: {
            psychologist_id_approach_id: {
              psychologist_id: userId,
              approach_id,
            },
          },
          create: {
            psychologist_id: userId,
            approach_id,
          },
          update: {
            deleted: false,
            deletedAt: null,
          },
        });
      }
    });

    if (!options.canUploadVideo) {
      await cleanupReplacedProfileVideo(userId, profile.video_url, profile.video_cover_url);
    }

    return this.show(userId);
  }

  async updateAvatar(
    userId: string,
    avatarUrl: string,
  ): Promise<FreeProfessionalProfileResponse | null> {
    const existing = await getUserWithProfile(userId);
    if (!existing?.psychologist_profile) return null;

    await prisma.user.update({
      where: { id: userId },
      data: { avatar: avatarUrl },
    });

    await deletePublicProfileMedia(existing.avatar);

    return this.show(userId);
  }

  async removeAvatar(userId: string): Promise<FreeProfessionalProfileResponse | null> {
    const existing = await getUserWithProfile(userId);
    if (!existing?.psychologist_profile) return null;

    await prisma.user.update({
      where: { id: userId },
      data: { avatar: null },
    });

    await deletePublicProfileMedia(existing.avatar);

    return this.show(userId);
  }

  async updateVideo(
    userId: string,
    videoUrl: string,
  ): Promise<FreeProfessionalProfileResponse | null> {
    const existing = await getUserWithProfile(userId);
    const profile = existing?.psychologist_profile;
    if (!profile) return null;

    await prisma.psychologist_profile.update({
      where: { id: profile.id },
      data: { video_url: videoUrl, video_cover_url: null },
    });

    if (profile.video_url !== videoUrl) {
      await cleanupReplacedProfileVideo(userId, profile.video_url, profile.video_cover_url);
    }

    return this.show(userId);
  }

  async updateCoverImage(
    userId: string,
    coverImageUrl: string,
  ): Promise<FreeProfessionalProfileResponse | null> {
    const existing = await getUserWithProfile(userId);
    const profile = existing?.psychologist_profile;
    if (!profile) return null;

    await prisma.psychologist_profile.update({
      where: { id: profile.id },
      data: { cover_image_url: coverImageUrl },
    });

    await deletePublicProfileMedia(profile.cover_image_url);

    return this.show(userId);
  }

  async updateVideoCover(
    userId: string,
    videoCoverUrl: string,
  ): Promise<FreeProfessionalProfileResponse | null> {
    const existing = await getUserWithProfile(userId);
    const profile = existing?.psychologist_profile;
    if (!profile) return null;

    await prisma.psychologist_profile.update({
      where: { id: profile.id },
      data: { video_cover_url: videoCoverUrl },
    });

    await deletePublicProfileMedia(profile.video_cover_url);

    return this.show(userId);
  }

  async removeVideo(userId: string): Promise<FreeProfessionalProfileResponse | null> {
    const existing = await getUserWithProfile(userId);
    const profile = existing?.psychologist_profile;
    if (!profile) return null;

    await prisma.psychologist_profile.update({
      where: { id: profile.id },
      data: { video_url: null, video_cover_url: null },
    });

    await cleanupReplacedProfileVideo(userId, profile.video_url, profile.video_cover_url);

    return this.show(userId);
  }

  async removeCoverImage(userId: string): Promise<FreeProfessionalProfileResponse | null> {
    const existing = await getUserWithProfile(userId);
    const profile = existing?.psychologist_profile;
    if (!profile) return null;

    await prisma.psychologist_profile.update({
      where: { id: profile.id },
      data: { cover_image_url: null },
    });

    await deletePublicProfileMedia(profile.cover_image_url);

    return this.show(userId);
  }
}

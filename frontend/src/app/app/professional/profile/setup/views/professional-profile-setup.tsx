"use client";

import {
  BadgeCheck,
  BookOpen,
  Camera,
  ExternalLink,
  Eye,
  EyeOff,
  FileVideo,
  Filter,
  GraduationCap,
  Loader2,
  MapPin,
  PencilLine,
  Plus,
  Trash2,
  UploadCloud,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { ActionableCoachMark } from "@/components/onboarding/actionable-coach-mark";
import { AppPageHeader } from "@/components/ui/app-page-header";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { VerticalVideoPlayer } from "@/components/ui/vertical-video-player";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";
import { CityField } from "../components/avatar-city-fields";
import { AvatarEditor } from "../components/avatar-editor";
import { BooleanBenefit, CatalogTagField, ChipPicker } from "../components/catalog-fields";
import { ProfileImagesPreview } from "../components/profile-images-preview";
import {
  ProfileHiddenBanner,
  ProfileInactiveBanner,
  SectionCard,
  VideoRemovalConfirmationModal,
} from "../components/profile-setup-shell";
import { ProfileVideoUploadProgress } from "../components/profile-video-upload-progress";
import { useProfessionalProfileSetupController } from "../hooks/use-professional-profile-setup-controller";
import {
  PROFESSIONAL_PROFILE_MENU_HREF,
  PSYCHOLOGIST_PROFILE_VIDEO_TIP_SELECTOR,
  resolveApiError,
} from "../modules/profile-setup-support";
import { WEEKDAY_OPTIONS } from "../options";

export const ProfessionalProfileSetupLogic = () => {
  const controller = useProfessionalProfileSetupController();
  const {
    Form,
    academicFormations,
    addressCity,
    addressState,
    approachIdsError,
    availableDaysError,
    canUploadVideo,
    cancelVideoUpload,
    cityOptions,
    confirmVideoRemoval,
    deleteVideo,
    form,
    handleVideoActionsToggle,
    handleVideoChange,
    handleVideoCoverChange,
    handleVideoCoverRequest,
    handleVideoRemoval,
    handleVideoUploadCardClick,
    isSubmitting,
    lockedCrpRegionFieldProps,
    lockedIdentityFieldProps,
    openVideoFilePicker,
    orderedApproachOptions,
    orderedServiceOptions,
    orderedSpecialtyGroups,
    orderedTargetAudienceOptions,
    profile,
    publicProfileHref,
    published,
    renderAcademicField,
    renderField,
    selectedApproaches,
    selectedDays,
    selectedServices,
    selectedSpecialties,
    selectedTargets,
    serviceIdsError,
    setArrayValue,
    setCatalogValue,
    setShowProfileVideoTip,
    specialtyIdsError,
    setVideoRemovalConfirmOpen,
    showHiddenProfileBanner,
    showInactiveProfileBanner,
    showProfileVideoTip,
    submit,
    targetAudienceError,
    update,
    uploadVideoCover,
    videoActionsOpen,
    videoCoverInputRef,
    videoCoverSrc,
    videoInputRef,
    videoRemovalConfirmOpen,
    videoSrc,
    videoUploadLimitMb,
    videoUploadBusy,
    videoUploadPhase,
    videoUploadProgress,
    videoUploadSummary,
    whatsappUrl,
  } = controller;

  return (
    <PrivateTemplate
      desktopSidebarDefaultCollapsed
      showHeader={false}
      showMobileNavigation={false}
      showNavigation
    >
      {showProfileVideoTip ? (
        <ActionableCoachMark
          onDismiss={() => setShowProfileVideoTip(false)}
          placement={videoSrc ? "bottom" : "top"}
          targetSelector={PSYCHOLOGIST_PROFILE_VIDEO_TIP_SELECTOR}
          title="Seu vídeo é seu principal destaque"
        >
          <p>
            O vídeo é o elemento principal para destacar seu perfil nos resultados de busca. Ele
            ajuda pacientes a sentirem confiança antes do contato e pode ser decisivo para converter
            uma primeira conversa.
          </p>
        </ActionableCoachMark>
      ) : null}

      <VideoRemovalConfirmationModal
        disabled={deleteVideo.isPending}
        onClose={() => setVideoRemovalConfirmOpen(false)}
        onConfirm={confirmVideoRemoval}
        open={videoRemovalConfirmOpen}
      />
      <section className="mx-auto grid w-full max-w-[394px] gap-4 md:max-w-3xl">
        <AppPageHeader
          backHref={PROFESSIONAL_PROFILE_MENU_HREF}
          backLabel="Voltar ao perfil"
          rightActionHref={publicProfileHref}
          rightActionIcon={<Eye className="h-5 w-5" aria-hidden="true" />}
          rightActionLabel="Visualizar perfil público"
          title="Editar perfil"
        />

        {showHiddenProfileBanner ? <ProfileHiddenBanner /> : null}
        {showInactiveProfileBanner ? <ProfileInactiveBanner /> : null}

        <ProfileImagesPreview controller={controller} />

        <AvatarEditor controller={controller} />

        {profile.isLoading ? <LoadingState label="Carregando perfil profissional" /> : null}

        {profile.isError ? (
          <InlineAlert title="Não foi possível carregar o perfil" variant="error">
            {resolveApiError(profile.error)}
          </InlineAlert>
        ) : null}

        {profile.data ? (
          <Form
            className="grid gap-4"
            {...form.formProps}
            fields={[]}
            id="free-profile-form"
            onSubmit={submit}
          >
            <SectionCard icon={UserRound} title="Informações básicas">
              <div className="grid gap-4">
                <div className="grid gap-3">
                  <div className="grid gap-3 sm:grid-cols-2 sm:items-start">
                    {renderField("professional_first_name")}
                    {renderField("professional_last_name")}
                  </div>
                  {renderField("cpf", lockedIdentityFieldProps)}
                  {renderField("birthdate")}
                  {renderField("gender")}
                  {renderField("race_color")}
                  {renderField("religion")}
                  {renderField("crp_region", lockedCrpRegionFieldProps)}
                  {renderField("crp_number", lockedIdentityFieldProps)}
                </div>
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">{renderField("whatsapp")}</div>
                  <a
                    aria-label="Testar link do WhatsApp"
                    className={cn(
                      "mt-7 grid h-12 w-12 shrink-0 place-items-center rounded-full border border-border text-primary transition hover:bg-primary-soft",
                      !whatsappUrl && "pointer-events-none opacity-40",
                    )}
                    href={whatsappUrl || "#"}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  </a>
                </div>
              </div>
            </SectionCard>

            <SectionCard icon={BookOpen} title="Apresentação">
              <div className="grid gap-4">
                {renderField("headline")}
                {renderField("bio")}
                {canUploadVideo ? (
                  <div
                    className="rounded-2xl border border-border bg-surface-muted p-4"
                    data-profile-field="profile_video"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface text-primary shadow-sm">
                          <FileVideo className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold leading-5 text-foreground">
                            Vídeo de Apresentação <span className="text-danger">*</span>
                          </p>
                        </div>
                      </div>

                      <div className="relative shrink-0">
                        <button
                          aria-expanded={videoActionsOpen}
                          aria-haspopup="menu"
                          aria-label="Editar vídeo de apresentação"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-primary transition hover:bg-primary-soft disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={
                            videoUploadBusy || uploadVideoCover.isPending || deleteVideo.isPending
                          }
                          data-psychologist-tip-target={videoSrc ? "profile-video" : undefined}
                          onClick={handleVideoActionsToggle}
                          type="button"
                        >
                          <PencilLine className="h-4 w-4" aria-hidden="true" />
                        </button>

                        {videoActionsOpen ? (
                          <div
                            className="absolute right-0 top-11 z-20 w-64 overflow-hidden rounded-2xl border border-border bg-surface text-left shadow-[var(--lectum-shadow-soft)]"
                            role="menu"
                          >
                            <button
                              className="flex w-full items-center gap-2 px-4 py-3 text-xs font-semibold text-foreground transition hover:bg-primary-soft hover:text-primary disabled:cursor-not-allowed disabled:opacity-45"
                              disabled={
                                !videoSrc ||
                                videoUploadBusy ||
                                uploadVideoCover.isPending ||
                                deleteVideo.isPending
                              }
                              onClick={handleVideoCoverRequest}
                              role="menuitem"
                              type="button"
                            >
                              <Camera className="h-4 w-4" aria-hidden="true" />
                              Adicionar imagem de capa
                            </button>
                            <button
                              className="flex w-full items-center gap-2 px-4 py-3 text-xs font-semibold text-foreground transition hover:bg-primary-soft hover:text-primary disabled:cursor-not-allowed disabled:opacity-45"
                              disabled={videoUploadBusy || uploadVideoCover.isPending}
                              onClick={openVideoFilePicker}
                              role="menuitem"
                              type="button"
                            >
                              <UploadCloud className="h-4 w-4" aria-hidden="true" />
                              Trocar vídeo
                            </button>
                            <button
                              className="flex w-full items-center gap-2 px-4 py-3 text-xs font-semibold text-danger transition hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-45"
                              disabled={
                                !videoSrc ||
                                videoUploadBusy ||
                                uploadVideoCover.isPending ||
                                deleteVideo.isPending
                              }
                              onClick={handleVideoRemoval}
                              role="menuitem"
                              type="button"
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                              Excluir vídeo
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <p className="mt-3 w-full text-xs leading-5 text-muted">
                      Envie um vídeo vertical de até {videoUploadLimitMb}MB. Ele é obrigatório para
                      publicar o perfil e aparecer na área pública da Lectum.
                    </p>

                    {videoUploadPhase ? (
                      <ProfileVideoUploadProgress
                        onCancel={cancelVideoUpload}
                        phase={videoUploadPhase}
                        progress={videoUploadProgress}
                        summary={videoUploadSummary}
                      />
                    ) : null}

                    {videoSrc ? (
                      <VerticalVideoPlayer
                        className="mt-4 w-full rounded-2xl md:mx-auto md:max-w-[390px] md:rounded-[22px] lg:max-w-[300px]"
                        poster={videoCoverSrc || undefined}
                        src={videoSrc}
                        title="Pré-visualização do vídeo de apresentação"
                      />
                    ) : (
                      <button
                        className="mt-4 grid min-h-32 w-full place-items-center rounded-2xl border border-dashed border-border bg-surface px-4 py-6 text-center transition hover:border-primary hover:bg-primary-soft/40 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={videoUploadBusy}
                        data-psychologist-tip-target={!videoSrc ? "profile-video" : undefined}
                        onClick={handleVideoUploadCardClick}
                        type="button"
                      >
                        <span>
                          {videoUploadBusy ? (
                            <Loader2
                              className="mx-auto h-8 w-8 animate-spin text-primary"
                              aria-hidden="true"
                            />
                          ) : (
                            <UploadCloud
                              className="mx-auto h-8 w-8 text-primary"
                              aria-hidden="true"
                            />
                          )}
                          <span className="mt-3 block text-sm font-bold text-foreground">
                            {videoUploadBusy
                              ? "Preparando vídeo..."
                              : "Toque para enviar seu vídeo"}
                          </span>
                          <span className="mt-1 block text-xs text-muted">MP4, MOV ou WebM.</span>
                        </span>
                      </button>
                    )}

                    <input
                      accept="video/mp4,video/webm,video/quicktime"
                      className="sr-only"
                      onChange={handleVideoChange}
                      ref={videoInputRef}
                      type="file"
                    />
                    <input
                      accept="image/jpeg,image/png,image/webp"
                      className="sr-only"
                      onChange={handleVideoCoverChange}
                      ref={videoCoverInputRef}
                      type="file"
                    />
                  </div>
                ) : (
                  <div
                    className="rounded-2xl border border-dashed border-border bg-surface-muted p-4 text-center opacity-80"
                    data-profile-field="profile_video"
                  >
                    <FileVideo className="mx-auto h-8 w-8 text-muted" aria-hidden="true" />
                    <p className="mt-2 text-sm font-bold text-foreground">
                      Vídeo de Apresentação <span className="text-danger">*</span>
                    </p>
                    <p className="mt-1 text-xs leading-5 text-muted">
                      Upload de vídeo deve estar disponível para todos os planos. Recarregue a
                      página se esta opção não aparecer.
                    </p>
                    <Link
                      className="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-primary-soft px-4 py-2 text-xs font-bold text-primary"
                      href="/app/profissional/perfil/configurar"
                    >
                      <UploadCloud className="h-4 w-4" aria-hidden="true" />
                      Atualizar tela
                    </Link>
                  </div>
                )}
              </div>
            </SectionCard>

            <SectionCard icon={Filter} title="Filtros">
              <div className="grid gap-6">
                <CatalogTagField
                  description={
                    profile.data.plan.is_free
                      ? "Selecione até 3 opções. Faça o upgrade para adicionar 10 especialidades."
                      : "Selecione até 10 especialidades."
                  }
                  error={specialtyIdsError}
                  items={profile.data.catalogs.specialties}
                  groupedItems={orderedSpecialtyGroups}
                  limit={profile.data.plan.specialty_limit}
                  name="specialty_ids"
                  onChange={setCatalogValue}
                  placeholder="Adicione uma especialidade..."
                  required
                  selected={selectedSpecialties}
                  title="Especialidades"
                />
                <CatalogTagField
                  description={
                    profile.data.plan.is_free
                      ? "Selecione 1 opção. Faça o upgrade para adicionar várias abordagens."
                      : "Selecione todas as abordagens que fazem parte da sua prática."
                  }
                  error={approachIdsError}
                  items={orderedApproachOptions}
                  limit={profile.data.plan.approach_limit}
                  name="approach_ids"
                  onChange={setCatalogValue}
                  placeholder="Adicione uma abordagem..."
                  required
                  selected={selectedApproaches}
                  title="Abordagens"
                />
                <CatalogTagField
                  description={
                    profile.data.plan.is_free
                      ? "Selecione 1 opção. Faça o upgrade para adicionar todos os serviços."
                      : "Selecione todos os serviços que você oferece."
                  }
                  error={serviceIdsError}
                  items={orderedServiceOptions}
                  limit={profile.data.plan.service_limit}
                  name="service_ids"
                  onChange={setCatalogValue}
                  placeholder="Adicione um serviço..."
                  required
                  selected={selectedServices}
                  title="Serviços"
                />
                <CatalogTagField
                  error={targetAudienceError}
                  items={orderedTargetAudienceOptions}
                  name="target_audience"
                  onChange={setCatalogValue}
                  placeholder="Adicione um público..."
                  required
                  selected={selectedTargets}
                  title="Público"
                  valueKey="slug"
                />
                {renderField("language")}
                <div className="grid gap-3">
                  <h3 className="text-sm font-bold text-foreground">Selos e Facilidades</h3>
                  <BooleanBenefit
                    checked={Boolean(
                      !profile.data?.plan.is_free && form.hook.watch("show_experience_tag"),
                    )}
                    disabled={profile.data?.plan.is_free}
                    description="Mostre a tag com o tempo de experiência calculado pelo registro profissional."
                    onChange={(checked) =>
                      form.hook.setValue("show_experience_tag", checked, {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                    title="Exibir tempo de experiência"
                  />
                  <BooleanBenefit
                    checked={form.hook.watch("discount_first_session")}
                    description="Reduza a barreira do primeiro contato."
                    onChange={(checked) =>
                      form.hook.setValue("discount_first_session", checked, {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                    title="Desconto na 1ª sessão"
                  />
                  <BooleanBenefit
                    checked={form.hook.watch("social_value")}
                    description="Atenda a população de baixa renda."
                    onChange={(checked) =>
                      form.hook.setValue("social_value", checked, {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                    title="Valor social"
                  />
                  <BooleanBenefit
                    checked={form.hook.watch("accepts_insurance")}
                    description="Atenda pacientes que possuem planos de saúde."
                    onChange={(checked) =>
                      form.hook.setValue("accepts_insurance", checked, {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                    title="Aceita Convênios"
                  />
                </div>
              </div>
            </SectionCard>

            <SectionCard icon={GraduationCap} title="Formação Acadêmica">
              <div className="grid gap-4">
                {academicFormations.fields.map((field, index) => (
                  <div className="grid gap-3 rounded-2xl border border-border p-4" key={field.id}>
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-sm font-bold text-foreground">Formação {index + 1}</h3>
                      {academicFormations.fields.length > 1 ? (
                        <button
                          aria-label={`Remover formação ${index + 1}`}
                          className="grid h-8 w-8 place-items-center rounded-full text-danger transition hover:bg-danger/10"
                          onClick={() => academicFormations.remove(index)}
                          type="button"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      ) : null}
                    </div>
                    <div className="grid gap-2">
                      {renderAcademicField(
                        index,
                        "title",
                        "Título e especialidade",
                        "Ex.: Doutor em Neuropsicologia",
                      )}
                      {renderAcademicField(
                        index,
                        "institution",
                        "Instituição",
                        "Ex.: Universidade de São Paulo",
                      )}
                      {renderAcademicField(
                        index,
                        "graduation_year",
                        "Ano de formação",
                        "Ex.: 2012",
                      )}
                    </div>
                  </div>
                ))}
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-primary/30 px-4 py-3 text-sm font-bold text-primary transition hover:bg-primary-soft disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={academicFormations.fields.length >= 5}
                  onClick={() =>
                    academicFormations.append({
                      title: "",
                      institution: "",
                      graduation_year: "",
                    })
                  }
                  type="button"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Adicionar nova formação
                </button>
              </div>
            </SectionCard>

            <SectionCard icon={MapPin} title="Atendimento">
              <div className="grid gap-5">
                {renderField("modality")}
                <ChipPicker
                  error={availableDaysError}
                  items={WEEKDAY_OPTIONS}
                  label="Dias com horários disponíveis"
                  name="available_days"
                  onChange={(value) => setArrayValue("available_days", value)}
                  selected={selectedDays}
                />
              </div>
            </SectionCard>

            <SectionCard icon={MapPin} title="Endereço Profissional">
              <div className="grid gap-4">
                {renderField("address_street")}
                <div className="grid grid-cols-2 gap-3">
                  {renderField("address_number")}
                  {renderField("address_complement")}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {renderField("address_district")}
                  {renderField("address_zip")}
                </div>
                {renderField("address_state")}
                <div data-profile-field="address_city">
                  <CityField
                    control={form.hook.control}
                    key={addressState || "sem-estado"}
                    options={cityOptions}
                    selectedValue={addressCity}
                    stateSelected={Boolean(addressState)}
                  />
                </div>
                <p className="text-xs leading-5 text-muted">
                  Suas informações de cidade e estado ficarão disponíveis no seu perfil público.
                </p>
              </div>
            </SectionCard>

            <section className="rounded-[var(--lectum-card-radius)] border border-border bg-surface p-5 shadow-[var(--lectum-shadow-soft)]">
              <div
                className={cn(
                  "flex items-center justify-between gap-4 rounded-2xl border border-border bg-surface-muted p-4 text-left",
                  !published && "border-danger/25 bg-danger/5",
                )}
              >
                <span className="grid min-w-0 gap-2">
                  <span className="block font-bold text-foreground">
                    {published ? "Perfil visível para pacientes" : "Perfil oculto para pacientes"}
                  </span>
                  <span
                    className={cn(
                      "inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-extrabold",
                      published ? "bg-success/10 text-success" : "bg-danger/10 text-danger",
                    )}
                  >
                    {published ? (
                      <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                      <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    {published ? "Visível para pacientes" : "Não visível para pacientes"}
                  </span>
                  <span className="block text-sm leading-5 text-muted">
                    Em caso de férias ou agenda lotada, desabilite a visibilidade para pausar a
                    exibição do seu perfil aos pacientes.
                  </span>
                </span>
                <button
                  aria-checked={published}
                  aria-label={
                    published ? "Desativar visibilidade do perfil" : "Ativar visibilidade do perfil"
                  }
                  className={cn(
                    "relative h-8 w-14 shrink-0 rounded-full border border-border bg-border-strong transition focus:outline-none focus:ring-4 focus:ring-primary/10",
                    published && "border-primary bg-primary",
                    !published && "border-danger/30 bg-danger/20 focus:ring-danger/10",
                  )}
                  onClick={() =>
                    form.hook.setValue("published", !published, {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                  role="switch"
                  type="button"
                >
                  <span
                    className={cn(
                      "absolute top-1 left-1 h-6 w-6 rounded-full bg-surface shadow-sm transition",
                      published && "translate-x-6",
                    )}
                  />
                </button>
              </div>
            </section>

            <div className="sticky bottom-4 z-10 rounded-full bg-surface/90 p-2 shadow-[var(--lectum-shadow-soft)] backdrop-blur">
              <Button
                className="h-14 w-full rounded-full text-base"
                disabled={isSubmitting}
                type="submit"
              >
                {update.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <BadgeCheck className="h-4 w-4" aria-hidden="true" />
                )}
                Salvar alterações
              </Button>
            </div>
          </Form>
        ) : null}
      </section>
    </PrivateTemplate>
  );
};

import type { Resolve } from "@/helpers/return";
import { error } from "@/helpers/translate";
import type {
  IPostRenderShareArtifactDTO,
  IPostRenderShareArtifactJobDTO,
} from "../../DTOs/IPostDTO";
import { ensureCommunityActor } from "./post-support";

const renderUnavailable = (): Resolve => ({
  status: 503,
  ...error("post_share_artifact_render_unavailable", {}),
});

const authorizeLegacyRenderRequest = (
  data: IPostRenderShareArtifactDTO | IPostRenderShareArtifactJobDTO,
): Resolve => ensureCommunityActor(data) ?? renderUnavailable();

// Compatibilidade temporária para clientes anteriores: as rotas continuam existindo durante o
// rollout independente, mas nenhum processamento pesado roda no backend HTTP.
export const renderShareArtifact = async (data: IPostRenderShareArtifactDTO): Promise<Resolve> =>
  authorizeLegacyRenderRequest(data);

export const startRenderShareArtifactJob = async (
  data: IPostRenderShareArtifactJobDTO,
): Promise<Resolve> => authorizeLegacyRenderRequest(data);

export const getRenderShareArtifactJob = async (
  data: IPostRenderShareArtifactJobDTO,
): Promise<Resolve> => authorizeLegacyRenderRequest(data);

export const getRenderShareArtifactJobFile = async (
  data: IPostRenderShareArtifactJobDTO,
): Promise<Resolve> => authorizeLegacyRenderRequest(data);

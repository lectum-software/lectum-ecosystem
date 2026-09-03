import { processVideoStreamWebhook } from "@/modules/video-assets/service";
import type { IVideoStreamWebhookDTO } from "../DTOs/IVideoStreamWebhookDTO";

export const store = (data: IVideoStreamWebhookDTO) => processVideoStreamWebhook(data);

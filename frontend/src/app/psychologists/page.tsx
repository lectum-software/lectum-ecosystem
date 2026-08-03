import type { Metadata } from "next";
import { PsychologistsLogic } from "@/app/app/psychologists/logic";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo";
import { resolveSeoMetadata } from "@/lib/seo-metadata";

export const generateMetadata = async (): Promise<Metadata> =>
  resolveSeoMetadata("psychologists", {
    canonical: "/psicologos",
    description: SITE_DESCRIPTION,
    title: `Psicólogos | ${SITE_NAME}`,
  });

export default function PsychologistsPage() {
  return <PsychologistsLogic />;
}

import type { Metadata } from "next";
import { PsychologistsLogic } from "@/app/app/psychologists/logic";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo";

export const metadata: Metadata = {
  title: `Psicólogos | ${SITE_NAME}`,
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: "/psychologists",
  },
};

export default function PsychologistsPage() {
  return <PsychologistsLogic />;
}

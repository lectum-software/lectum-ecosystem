import { LegalTemplate } from "@/templates/legal";
import { getLegalMetadata, getLegalPage, type LegalPageProps } from "@/templates/legal/logic";

export const dynamic = "force-dynamic";

export const generateMetadata = ({ searchParams }: LegalPageProps) =>
  getLegalMetadata("privacy", searchParams);

export default async function Page({ searchParams }: LegalPageProps) {
  return <LegalTemplate {...(await getLegalPage("privacy", searchParams))} />;
}

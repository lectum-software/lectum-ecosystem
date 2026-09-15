import { CommunityRouteLogic } from "@/app/app/community/[slug]/logic";
import { CreateCommunityPostLogic } from "@/app/app/community/[slug]/post/new/logic";

export default function CreateCommunityPostPage() {
  return (
    <>
      <div aria-hidden="true" className="min-h-screen">
        <CommunityRouteLogic suppressPublishOnboarding />
      </div>
      <CreateCommunityPostLogic />
    </>
  );
}

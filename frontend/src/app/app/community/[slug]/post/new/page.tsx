import { CommunityRouteLogic } from "../../logic";
import { CreateCommunityPostLogic } from "./logic";

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

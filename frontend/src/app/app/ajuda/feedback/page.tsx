import { FeedbackForm } from "./form";
export default function Page() {
  return <FeedbackForm appVersion={process.env.LECTUM_APP_VERSION} />;
}

import AnswerPage from "@/features/answers/AnswerPage";

/**
 * Public. Patients open this from an emailed link with no session, so it lives
 * outside the (app) group and its layout, which would render the sidebar and
 * call Clerk hooks.
 */
export default function Page() {
  return <AnswerPage />;
}

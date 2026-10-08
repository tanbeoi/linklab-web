import { ApplicantsList } from "@/components/applicants-list";

export default async function PostApplicantsPage(
    props: PageProps<"/my-posts/[postId]/applications">,
) {
    const { postId } = await props.params;

    return <ApplicantsList postId={postId} />;
}

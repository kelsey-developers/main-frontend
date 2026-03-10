import { redirect } from 'next/navigation';

export default function RegisterAgentRedirect({
  searchParams,
}: {
  searchParams: Record<string, string>;
}) {
  const query = new URLSearchParams(searchParams).toString();
  redirect(`/become-an-agent${query ? `?${query}` : ''}`);
}

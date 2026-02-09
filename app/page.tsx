import { redirect } from "next/navigation";

/**
 * Root path redirects to Rewards (main focus).
 */
export default function Home() {
  redirect("/home");
}

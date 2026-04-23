import { redirect } from "next/navigation";
import { getUser, getUserRole } from "../lib/auth";
import { getRoleHome } from "../lib/roleAccess";

export default async function Home() {
  const user = await getUser();
  if (!user) redirect("/login");
  redirect(getRoleHome(getUserRole(user)));
}

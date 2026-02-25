import { redirect } from "next/navigation";

export default function Home() {
  redirect("/studio"); // 或 /dashboard
}
import React from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import SessionProvider from "../../components/auth/SessionProvider";
import { AppLayout } from "@/components/app-shell/AppLayout";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  return (
    <SessionProvider session={session}>
      <AppLayout>{children}</AppLayout>
    </SessionProvider>
  );
}
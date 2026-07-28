import { requireUser } from "@/lib/auth";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireUser();

  return (
    <DashboardShell name={profile.name} email={profile.email} role={profile.role}>
      {children}
    </DashboardShell>
  );
}

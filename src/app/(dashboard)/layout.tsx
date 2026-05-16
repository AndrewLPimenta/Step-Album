import { requireUser } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireUser();

  return (
    <div className="min-h-dvh flex">
      <Sidebar role={profile.role} />
      <div className="flex-1 md:pl-60 flex flex-col min-w-0">
        <Header name={profile.name} email={profile.email} role={profile.role} />
        <main className="flex-1 p-4 md:p-6 animate-fade-in">{children}</main>
      </div>
    </div>
  );
}

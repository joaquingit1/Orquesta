// Dashboard layout — applies dark theme scoped to this route segment.
// This <div className="dark"> activates all .dark CSS variables defined in globals.css
// for the entire /dashboard subtree, while the landing page at / stays in light theme.

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="dark min-h-screen bg-background text-foreground">
      {children}
    </div>
  );
}

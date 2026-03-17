export default function AttendanceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="pt-16 min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {children}
      </div>
    </div>
  );
}

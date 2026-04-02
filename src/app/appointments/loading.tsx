export default function AppointmentsLoading() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-40 bg-gray-200 rounded mb-2" />
          <div className="h-4 w-56 bg-gray-100 rounded" />
        </div>
        <div className="h-9 w-36 bg-gray-200 rounded-lg" />
      </div>

      {/* Date & filters */}
      <div className="flex gap-3 items-center">
        <div className="h-10 w-40 bg-gray-100 rounded-lg" />
        <div className="h-10 w-28 bg-gray-100 rounded-lg" />
        <div className="h-10 w-28 bg-gray-100 rounded-lg" />
      </div>

      {/* Appointment cards */}
      <div className="grid gap-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl p-4 border border-gray-100 flex items-center gap-4">
            <div className="h-12 w-12 bg-gray-100 rounded-lg" />
            <div className="flex-1">
              <div className="h-4 w-40 bg-gray-100 rounded mb-2" />
              <div className="h-3 w-28 bg-gray-50 rounded" />
            </div>
            <div className="h-6 w-20 bg-gray-100 rounded-full" />
            <div className="h-8 w-8 bg-gray-50 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

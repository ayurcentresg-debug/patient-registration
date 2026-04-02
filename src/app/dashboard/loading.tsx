export default function DashboardLoading() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-48 bg-gray-200 rounded mb-2" />
          <div className="h-4 w-64 bg-gray-100 rounded" />
        </div>
        <div className="h-9 w-32 bg-gray-200 rounded-lg" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl p-5 border border-gray-100">
            <div className="h-4 w-24 bg-gray-100 rounded mb-3" />
            <div className="h-8 w-16 bg-gray-200 rounded" />
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <div className="h-5 w-40 bg-gray-200 rounded mb-4" />
          <div className="h-48 bg-gray-50 rounded" />
        </div>
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <div className="h-5 w-40 bg-gray-200 rounded mb-4" />
          <div className="h-48 bg-gray-50 rounded" />
        </div>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl p-6 border border-gray-100">
            <div className="h-5 w-36 bg-gray-200 rounded mb-4" />
            {[...Array(4)].map((_, j) => (
              <div key={j} className="flex items-center gap-3 py-3 border-b border-gray-50">
                <div className="h-8 w-8 bg-gray-100 rounded-full" />
                <div className="flex-1">
                  <div className="h-4 w-32 bg-gray-100 rounded mb-1" />
                  <div className="h-3 w-24 bg-gray-50 rounded" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

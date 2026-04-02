export default function AdminLoading() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-36 bg-gray-200 rounded mb-2" />
          <div className="h-4 w-56 bg-gray-100 rounded" />
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-100 pb-1">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-9 w-24 bg-gray-100 rounded-lg" />
        ))}
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl p-6 border border-gray-100 space-y-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="h-4 w-32 bg-gray-100 rounded" />
            <div className="h-10 flex-1 bg-gray-50 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

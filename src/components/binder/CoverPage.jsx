const CoverPage = ({ binder }) => {
  return (
    <div className="flex-1 bg-white rounded-lg shadow-2xl relative overflow-hidden">
      {/* Cover Design */}
      <div className="h-full flex flex-col items-center justify-center p-8 bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* Binder Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            {binder?.name || "My Pokemon Binder"}
          </h1>
          <p className="text-gray-600 text-lg">
            {binder?.metadata?.description || "Pokemon Card Collection"}
          </p>
        </div>

        {/* Cover Art/Logo */}
        <div className="text-8xl mb-8 opacity-80">🎴</div>

        {/* Created Date */}
        <div className="mt-8 text-sm text-gray-500">
          Created{" "}
          {binder?.metadata?.createdAt
            ? new Date(binder.metadata.createdAt).toLocaleDateString()
            : "Today"}
        </div>
      </div>
    </div>
  );
};

export default CoverPage;

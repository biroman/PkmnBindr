import PropTypes from "prop-types";

const SetInfo = ({ set }) => {
  if (!set) return null;
  return (
    <div className="bg-gray-800/40 backdrop-blur-sm rounded-xl p-5 border border-gray-700/50">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-gray-700/30 rounded-lg">
          <img
            src={set.images.symbol}
            alt={`${set.name} symbol`}
            className="w-6 h-6 filter drop-shadow-lg"
          />
        </div>
        <h2 className="text-xl font-bold text-white tracking-tight truncate">
          {set.name}
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-gray-700/30 rounded-lg p-3">
          <p className="text-gray-400 text-xs font-medium mb-1">Series</p>
          <p className="text-white truncate font-medium">{set.series}</p>
        </div>
        <div className="bg-gray-700/30 rounded-lg p-3">
          <p className="text-gray-400 text-xs font-medium mb-1">Total Cards</p>
          <p className="text-white font-medium">
            {set.total}
            <span className="text-gray-400 text-xs ml-1">
              ({set.printedTotal} printed)
            </span>
          </p>
        </div>
      </div>

      <div className="mb-4">
        <p className="text-gray-400 text-xs font-medium mb-1">Release Date</p>
        <p className="text-white font-medium">{set.releaseDate}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {Object.entries(set.legalities).map(([format]) => (
          <span
            key={format}
            className={`px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm transition-colors
              ${
                format === "standard"
                  ? "bg-green-500/10 text-green-400 border border-green-500/20"
                  : format === "expanded"
                  ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                  : "bg-purple-500/10 text-purple-400 border border-purple-500/20"
              }`}
          >
            {format}
          </span>
        ))}
      </div>
    </div>
  );
};

SetInfo.propTypes = {
  set: PropTypes.object,
};

export default SetInfo;

import { Menu, X, FolderOpen, ArrowLeft, ArrowRight } from "lucide-react";
import { useTheme } from "../../theme/ThemeContent";
import { Link } from "react-router-dom";

const AppHeader = ({
  showSidebar,
  onToggleSidebar,
  currentBinder,
  set,
  cards,
  currentPage,
  onCurrentPageChange,
  layout,
  progress,
}) => {
  const { theme } = useTheme();

  const handlePreviousPage = () => {
    onCurrentPageChange((p) => Math.max(p - 1, 0));
  };

  const handleNextPage = () => {
    const totalPhysicalPages = Math.ceil(cards.length / layout.cards);
    const adjustedTotalPages = Math.ceil((totalPhysicalPages + 1) / 2);
    onCurrentPageChange((p) => Math.min(p + 1, adjustedTotalPages - 1));
  };

  const getPageDisplay = () => {
    const totalPhysicalPages = Math.ceil(cards.length / layout.cards);

    if (currentPage === 0) {
      return "Cover Page";
    } else {
      const leftPhysicalPage = 2 * currentPage - 1;
      const rightPhysicalPage = 2 * currentPage;
      return `Pages ${leftPhysicalPage + 1}-${
        rightPhysicalPage + 1
      } of ${totalPhysicalPages}`;
    }
  };

  const isNextPageDisabled = () => {
    const totalPhysicalPages = Math.ceil(cards.length / layout.cards);
    const adjustedTotalPages = Math.ceil((totalPhysicalPages + 1) / 2);
    return currentPage >= adjustedTotalPages - 1;
  };

  return (
    <header
      className={`${theme.colors.background.sidebar} border-b ${theme.colors.border.accent} px-6 py-4`}
    >
      <div className="grid grid-cols-3 items-center">
        {/* Left Section */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            {/* Sidebar Toggle Button */}
            <button
              onClick={onToggleSidebar}
              className={`p-2 rounded-lg ${theme.colors.button.secondary} transition-all duration-200 hover:scale-105`}
              title={showSidebar ? "Hide sidebar" : "Show sidebar"}
            >
              {showSidebar ? (
                <X className="w-4 h-4" />
              ) : (
                <Menu className="w-4 h-4" />
              )}
            </button>

            <div>
              <Link to="/">
                <h1
                  className={`text-xl font-bold ${theme.colors.text.primary}`}
                >
                  PkmnBindr
                </h1>
              </Link>
              <p className={`text-sm ${theme.colors.text.secondary}`}>
                Pokemon Collection Manager
              </p>
            </div>
          </div>

          {currentBinder && set && (
            <div className="hidden xl:flex items-center gap-4">
              <div className={`h-6 w-px ${theme.colors.border.accent}`} />
              <div className="flex items-center gap-2">
                <FolderOpen className={`w-4 h-4 ${theme.colors.text.accent}`} />
                <span
                  className={`text-sm font-medium ${theme.colors.text.primary}`}
                >
                  {currentBinder.name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-sm ${theme.colors.text.secondary}`}>
                  •
                </span>
                <span className={`text-sm ${theme.colors.text.secondary}`}>
                  {set.name}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Center Section - Navigation */}
        <div className="flex justify-center">
          {cards.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={handlePreviousPage}
                disabled={currentPage === 0}
                className={`
                  w-8 h-8 rounded-lg flex items-center justify-center
                  ${theme.colors.button.secondary}
                  enabled:hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed
                  transition-all duration-200
                `}
                title="Previous page"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              <div
                className={`
                  px-3 py-1.5 ${theme.colors.background.card} rounded-lg
                  border ${theme.colors.border.accent}
                  text-sm font-medium ${theme.colors.text.primary}
                  min-w-[120px] text-center
                  transition-all duration-200
                `}
              >
                {getPageDisplay()}
              </div>

              <button
                onClick={handleNextPage}
                disabled={isNextPageDisabled()}
                className={`
                  w-8 h-8 rounded-lg flex items-center justify-center
                  ${theme.colors.button.secondary}
                  enabled:hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed
                  transition-all duration-200
                `}
                title="Next page"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Right Section - Progress */}
        <div className="flex items-center gap-3 justify-end">
          {(progress.totalCards > 0 ||
            (progress.isCustomBinder && progress.actualCardsInBinder > 0)) && (
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="flex items-center justify-end gap-2 mb-1">
                  <span
                    className={`text-sm font-bold ${theme.colors.text.primary}`}
                  >
                    {progress.isCustomBinder
                      ? `${progress.collectedCount}/${progress.actualCardsInBinder}`
                      : `${progress.collectedCount}/${progress.totalCards}`}
                  </span>
                  <span
                    className={`text-xs ${theme.colors.text.secondary} font-medium`}
                  >
                    Collected
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden shadow-inner relative">
                    <div
                      className={`h-full bg-gradient-to-r ${theme.colors.progress.from} ${theme.colors.progress.to} transition-all duration-500 ease-out rounded-full`}
                      style={{ width: `${progress.progressPercentage}%` }}
                    />
                    {/* Progress bar glow effect */}
                    <div
                      className={`absolute top-0 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-all duration-500 ease-out rounded-full`}
                      style={{ width: `${progress.progressPercentage}%` }}
                    />
                  </div>
                  <span
                    className={`text-sm font-bold ${theme.colors.text.accent} min-w-[45px]`}
                  >
                    {progress.progressPercentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default AppHeader;

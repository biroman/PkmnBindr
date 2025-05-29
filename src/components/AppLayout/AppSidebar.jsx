import { X, Loader2, FileText, ListX } from "lucide-react";
import { useTheme } from "../../theme/ThemeContent";
import EnhancedBinderSelector from "../BinderSelector/EnhancedBinderSelector";
import SetSelector from "../SetSelector/SetSelector";
import BinderLayoutSelector from "../BinderPage/BinderLayoutSelector";
import StorageControls from "../StorageControls/StorageControls";
import DarkModeToggle from "../DarkModeToggle";
import ThemeSelector from "../ThemeSelector";

const AppSidebar = ({
  showSidebar,
  onToggleSidebar,
  // Binder props
  binders,
  currentBinder,
  onBinderSelect,
  onBinderCreate,
  onBinderDelete,
  onBinderRename,
  // Set props
  selectedSet,
  onSetSelect,
  loading,
  setLoadingError,
  // Layout props
  layout,
  onLayoutChange,
  displayOptions,
  onDisplayOptionsChange,
  // Missing cards props
  missingCards,
  parsedMissingCards,
  onMissingCardsChange,
  // Actions props
  set,
  cards,
  onShowFullSetList,
  onShowMissingCardsList,
  // Storage props
  onDataImported,
  // Error
  error,
}) => {
  const { theme } = useTheme();

  return (
    <>
      {/* Sidebar */}
      <aside
        className={`
          ${showSidebar ? "translate-x-0" : "-translate-x-full"}
          fixed lg:relative
          z-30 lg:z-0
          w-86 lg:w-106 h-full
          ${theme.colors.background.sidebar}
          border-r ${theme.colors.border.accent}
          transition-transform duration-300 ease-in-out
          flex flex-col
        `}
      >
        {/* Sidebar Header */}
        <div className="p-6 border-b border-gray-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h2
                className={`text-lg font-semibold ${theme.colors.text.primary}`}
              >
                Collection Manager
              </h2>
              <div className="flex items-center gap-3">
                <DarkModeToggle />
                <div className={`w-px h-6 ${theme.colors.border.light}`}></div>
                <ThemeSelector />
              </div>
            </div>
            <button
              onClick={onToggleSidebar}
              className={`p-2 rounded-lg ${theme.colors.button.secondary} lg:hidden transition-all duration-200 hover:scale-105`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sidebar Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Binder Management */}
          <section>
            <h3
              className={`text-sm font-medium ${theme.colors.text.accent} mb-4 uppercase tracking-wide`}
            >
              Binder Management
            </h3>
            <EnhancedBinderSelector
              binders={binders}
              currentBinder={currentBinder}
              onBinderSelect={onBinderSelect}
              onBinderCreate={onBinderCreate}
              onBinderDelete={onBinderDelete}
              onBinderRename={onBinderRename}
            />
          </section>

          {currentBinder && (
            <>
              {/* Set Selection */}
              {currentBinder.binderType !== "custom" && (
                <section className="relative">
                  <h3
                    className={`text-sm font-medium ${theme.colors.text.accent} mb-4 uppercase tracking-wide`}
                  >
                    Set Selection
                  </h3>
                  <SetSelector
                    onSetSelect={onSetSelect}
                    selectedSet={selectedSet}
                    loading={loading}
                    error={setLoadingError}
                  />

                  {/* Loading overlay */}
                  {loading && (
                    <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px] rounded-xl flex items-center justify-center">
                      <div
                        className={`${theme.colors.background.card} rounded-lg p-4 shadow-lg border ${theme.colors.border.accent}`}
                      >
                        <div className="flex items-center gap-3">
                          <Loader2
                            className={`w-5 h-5 ${theme.colors.text.accent} animate-spin`}
                          />
                          <div>
                            <div
                              className={`text-sm font-medium ${theme.colors.text.primary}`}
                            >
                              Loading Set
                            </div>
                            <div
                              className={`text-xs ${theme.colors.text.secondary}`}
                            >
                              Fetching cards from API...
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </section>
              )}

              {/* Layout Options */}
              {(set || currentBinder.binderType === "custom") && (
                <section>
                  <h3
                    className={`text-sm font-medium ${theme.colors.text.accent} mb-4 uppercase tracking-wide`}
                  >
                    View Options
                  </h3>
                  <BinderLayoutSelector
                    currentLayout={layout}
                    onLayoutChange={onLayoutChange}
                    displayOptions={displayOptions}
                    onDisplayOptionsChange={onDisplayOptionsChange}
                    isCustomBinder={currentBinder?.binderType === "custom"}
                  />
                </section>
              )}

              {/* Missing Cards */}
              {selectedSet && (
                <section>
                  <h3
                    className={`text-sm font-medium ${theme.colors.text.accent} mb-4 uppercase tracking-wide`}
                  >
                    Missing Cards
                  </h3>
                  <div
                    className={`${theme.colors.background.card} rounded-xl p-4 space-y-4`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-sm font-medium ${theme.colors.text.primary}`}
                      >
                        Track Missing Cards
                      </span>
                      {parsedMissingCards.size > 0 && (
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-md ${theme.colors.button.primary}`}
                        >
                          {parsedMissingCards.size} hidden
                        </span>
                      )}
                    </div>

                    {parsedMissingCards.size > 0 && (
                      <div
                        className={`text-xs ${theme.colors.text.secondary} bg-blue-500/10 p-2 rounded-lg`}
                      >
                        💡 Cards listed below are automatically hidden from the
                        binder view
                      </div>
                    )}

                    <textarea
                      value={missingCards}
                      onChange={onMissingCardsChange}
                      disabled={!currentBinder || !set}
                      placeholder={`Enter missing cards (one per line):
5, 13, 58
[1], [25], [150]  
001/178, 025/178
5rh, 13rh`}
                      className={`w-full h-32 px-3 py-2 rounded-lg text-sm
                        resize-none
                        transition-all duration-200
                        ${theme.colors.background.sidebar}
                        border ${theme.colors.border.accent}
                        ${theme.colors.text.primary}
                        focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500/50
                        disabled:opacity-50 disabled:cursor-not-allowed
                        placeholder:${theme.colors.text.secondary}`}
                    />

                    {/* Auto-save indicator */}
                    {set && currentBinder && (
                      <div
                        className={`text-xs ${theme.colors.text.secondary} text-center`}
                      >
                        ✓ Changes are automatically saved
                      </div>
                    )}
                  </div>

                  {/* Format Guide */}
                  <div
                    className={`mt-4 p-4 rounded-lg ${theme.colors.background.sidebar}`}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <FileText
                        className={`w-4 h-4 ${theme.colors.text.accent}`}
                      />
                      <span
                        className={`text-xs font-medium ${theme.colors.text.accent}`}
                      >
                        Supported Formats
                      </span>
                    </div>
                    <div
                      className={`grid grid-cols-1 gap-3 text-xs ${theme.colors.text.secondary}`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`px-2 py-1 rounded-md ${theme.colors.background.card} font-mono`}
                        >
                          #1
                        </span>
                        <span>Number with hash</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`px-2 py-1 rounded-md ${theme.colors.background.card} font-mono`}
                        >
                          [1]
                        </span>
                        <span>Bracketed number</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`px-2 py-1 rounded-md ${theme.colors.background.card} font-mono`}
                        >
                          001/178
                        </span>
                        <span>Set fraction</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`px-2 py-1 rounded-md ${theme.colors.background.card} font-mono`}
                        >
                          25
                        </span>
                        <span>Just the number</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`px-2 py-1 rounded-md ${theme.colors.background.card} font-mono`}
                        >
                          Pikachu
                        </span>
                        <span>Card name</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`px-2 py-1 rounded-md ${theme.colors.background.card} font-mono`}
                        >
                          25rh
                        </span>
                        <span>Reverse holo cards</span>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* Actions */}
              {set && cards.length > 0 && (
                <section>
                  <h3
                    className={`text-sm font-medium ${theme.colors.text.accent} mb-4 uppercase tracking-wide`}
                  >
                    Export & Lists
                  </h3>
                  <div className="space-y-3">
                    <button
                      onClick={onShowFullSetList}
                      className={`w-full px-4 py-3 text-sm font-medium rounded-xl
                        transition-all duration-200
                        hover:${theme.colors.background.sidebar}
                        focus:outline-none focus:ring-2 focus:ring-offset-2
                        flex items-center justify-center gap-2
                        ${theme.colors.button.secondary} border ${theme.colors.border.accent}`}
                    >
                      <FileText className="w-4 h-4" />
                      Full Set List
                    </button>

                    <button
                      onClick={onShowMissingCardsList}
                      disabled={parsedMissingCards.size === 0}
                      className={`w-full px-4 py-3 text-sm font-medium rounded-xl
                        transition-all duration-200
                        hover:${theme.colors.background.sidebar}
                        focus:outline-none focus:ring-2 focus:ring-offset-2
                        flex items-center justify-center gap-2
                        disabled:opacity-50 disabled:cursor-not-allowed
                        ${theme.colors.button.secondary} border ${theme.colors.border.accent}`}
                    >
                      <ListX className="w-4 h-4" />
                      Missing Cards List
                    </button>
                  </div>
                </section>
              )}
            </>
          )}

          {error && (
            <div className="text-red-400 text-sm bg-red-500/10 p-3 rounded-lg">
              {error}
            </div>
          )}
        </div>

        {/* Sidebar Footer */}
        <div className={`p-6 border-t ${theme.colors.border.accent}`}>
          <StorageControls onDataImported={onDataImported} />
        </div>
      </aside>

      {/* Sidebar Overlay */}
      {showSidebar && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:bg-transparent"
          onClick={onToggleSidebar}
        />
      )}
    </>
  );
};

export default AppSidebar;

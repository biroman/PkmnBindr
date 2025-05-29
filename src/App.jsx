import { useState, useEffect, useCallback } from "react";
import { AppProvider } from "./contexts/AppContext";
import {
  AppShell,
  AppContent,
  AppModals,
  ErrorState,
  BinderLoader,
} from "./components/AppLayout";

// Custom hooks
import {
  useBinder,
  useCards,
  useCardClipboard,
  useBinderHistory,
  useMissingCards,
  useUrlState,
  useBinderValidation,
  useModalManager,
  useKeyboardShortcuts,
} from "./hooks";

// Storage utilities
import { getLayoutPrefs, saveLayoutPrefs } from "./utils/storageUtils";
import logger from "./utils/logger";

/**
 * Main App Component - Refactored for better maintainability
 * Reduced from ~750 lines to ~300 lines using composition and custom hooks
 */
const App = () => {
  // ===== LOCAL UI STATE =====
  const [showSidebar, setShowSidebar] = useState(false);
  const [setLoadingError, setSetLoadingError] = useState(null);
  const [layout, setLayout] = useState({
    id: "3x3",
    label: "3×3",
    cards: 9,
  });

  // ===== CUSTOM HOOKS =====
  const urlState = useUrlState();
  const modalManager = useModalManager();
  const binderHook = useBinder();
  const cardsHook = useCards();
  const clipboardHook = useCardClipboard();
  const historyHook = useBinderHistory();
  const missingCardsHook = useMissingCards();

  // ===== DERIVED STATE =====
  const binderValidation = useBinderValidation(
    binderHook.binders,
    urlState.binderId
  );
  const currentBinder = binderValidation.binder;

  // Destructure what we need from hooks
  const {
    binders,
    currentBinder: baseCurrentBinder,
    handleBinderSelect: baseHandleBinderSelect,
    handleBinderCreate,
    handleBinderDelete,
    handleBinderRename,
    handleDataImported,
    updateBinderState,
  } = binderHook;

  const {
    selectedSet,
    set,
    cards,
    rawCards,
    loading,
    error,
    displayOptions,
    handleSearch,
    handleAddCard: baseHandleAddCard,
    handleRemoveCard: baseHandleRemoveCard,
    handleReorderCards: baseHandleReorderCards,
    handleOpenCardSearch,
    handleCloseCardSearch,
    handleMoveCards: baseHandleMoveCards,
    resetCards,
    loadCustomCards,
    loadSetCards,
    setSelectedSet: setSelectedSetInHook,
    setDisplayOptions,
    setCards,
    processCards,
  } = cardsHook;

  const {
    clipboardCards,
    isClipboardCollapsed,
    handleAddToClipboard,
    handleRemoveFromClipboard,
    handleClearClipboard,
    handleAddToCurrentPage: baseHandleAddToCurrentPage,
    handleMoveFromClipboard: baseHandleMoveFromClipboard,
    handleToggleClipboard,
  } = clipboardHook;

  const {
    historyEntries,
    isHistoryCollapsed,
    handleRevertToEntry: baseHandleRevertToEntry,
    handleClearHistory: baseHandleClearHistory,
    handleNavigateHistory: baseHandleNavigateHistory,
    handleNavigateToPage,
    handleNavigateHistoryWithPageJump: baseHandleNavigateHistoryWithPageJump,
    handleToggleHistory,
    loadHistoryForBinder,
    canNavigateBack,
    canNavigateForward,
    getCurrentPosition,
  } = historyHook;

  const {
    missingCards,
    parsedMissingCards,
    loadMissingCards,
    handleMissingCardsChange: baseHandleMissingCardsChange,
    handleToggleCardStatus: baseHandleToggleCardStatus,
    calculateProgress,
  } = missingCardsHook;

  // ===== ENHANCED HANDLERS =====

  // Enhanced page change handler that handles both direct values and function updaters
  const handleCurrentPageChange = useCallback(
    (newPageOrUpdater) => {
      if (typeof newPageOrUpdater === "function") {
        const newPage = newPageOrUpdater(urlState.currentPage);
        urlState.setCurrentPage(newPage);
      } else {
        urlState.setCurrentPage(newPageOrUpdater);
      }
    },
    [urlState]
  );

  // ===== KEYBOARD SHORTCUTS =====
  const handleNavigateHistoryWithPageJump = useCallback(
    (direction) => {
      const result = baseHandleNavigateHistoryWithPageJump(
        currentBinder,
        direction,
        layout,
        handleCurrentPageChange
      );
      if (result.success) {
        setCards(result.updatedCustomCards);
        updateBinderState({
          ...currentBinder,
          customCards: result.updatedCustomCards,
        });
      }
    },
    [
      baseHandleNavigateHistoryWithPageJump,
      currentBinder,
      layout,
      handleCurrentPageChange,
      setCards,
      updateBinderState,
    ]
  );

  useKeyboardShortcuts({
    currentBinder,
    canNavigateBack: canNavigateBack(currentBinder),
    canNavigateForward: canNavigateForward(currentBinder),
    handleNavigateHistoryWithPageJump,
  });

  // ===== LAYOUT PERSISTENCE =====
  useEffect(() => {
    const savedLayout = getLayoutPrefs();
    if (savedLayout) setLayout(savedLayout);
  }, []);

  useEffect(() => {
    saveLayoutPrefs(layout);
  }, [layout]);

  // ===== BINDER SYNC LOGIC =====
  useEffect(() => {
    if (binderValidation.status === "valid" && currentBinder) {
      const needsLoading =
        !baseCurrentBinder ||
        baseCurrentBinder.id !== currentBinder.id ||
        (currentBinder.binderType === "custom" && cards.length === 0) ||
        (currentBinder.binderType !== "custom" &&
          !selectedSet &&
          currentBinder.sets?.length > 0);

      if (needsLoading) {
        // Reset cards when loading a different binder to prevent state pollution
        if (!baseCurrentBinder || baseCurrentBinder.id !== currentBinder.id) {
          resetCards();
        }

        if (currentBinder.binderType === "custom") {
          loadCustomCards(currentBinder.id);
          loadHistoryForBinder(currentBinder.id);
        } else if (currentBinder.sets?.length > 0) {
          const currentSet = currentBinder.sets[0];
          setSelectedSetInHook(currentSet);
          loadSetCards(currentSet, processCards);
        }

        if (!baseCurrentBinder || baseCurrentBinder.id !== currentBinder.id) {
          baseHandleBinderSelect(currentBinder);
        }
      }
    }
  }, [
    binderValidation.status,
    currentBinder?.id,
    currentBinder?.binderType,
    baseCurrentBinder?.id,
    cards.length,
    selectedSet?.id,
  ]);

  // ===== MISSING CARDS SYNC =====
  useEffect(() => {
    if (currentBinder && set) {
      loadMissingCards(set, currentBinder);
    }
  }, [set, currentBinder?.id, loadMissingCards]);

  const handleBinderSelect = useCallback(
    async (binder) => {
      resetCards();

      if (binder.binderType === "custom") {
        urlState.setBinderId(binder.id);
        loadCustomCards(binder.id);
        loadHistoryForBinder(binder.id);
      } else {
        urlState.setBinderId(binder.id);
        if (binder.sets?.length > 0) {
          try {
            const result = await loadSetCards(binder.sets[0], processCards);
            if (!result.success) {
              logger.error("Error loading set cards:", result);
            }
          } catch (err) {
            logger.error("Error loading set cards:", err);
          }
        }
      }
    },
    [
      urlState,
      resetCards,
      loadCustomCards,
      loadHistoryForBinder,
      loadSetCards,
      processCards,
    ]
  );

  const handleLayoutChange = useCallback(
    (newLayout) => {
      setLayout(newLayout);
      urlState.setCurrentPage(0);
    },
    [urlState]
  );

  const handleClearBinder = useCallback(() => {
    urlState.clearUrlState();
    resetCards();
  }, [urlState, resetCards]);

  // Enhanced binder deletion that clears URL if deleting current binder
  const handleBinderDeleteWithUrlClear = useCallback(
    (binderId) => {
      const isCurrentBinder = currentBinder?.id === binderId;

      // Call the original delete function
      handleBinderDelete(binderId);

      // If we deleted the current binder, clear the URL state
      if (isCurrentBinder) {
        urlState.clearUrlState();
        resetCards();
      }
    },
    [handleBinderDelete, currentBinder?.id, urlState, resetCards]
  );

  // ===== CARD SEARCH HANDLERS =====
  const handleOpenCardSearchModal = useCallback(
    (position = null) => {
      handleOpenCardSearch(position);
      modalManager.handleOpenCardSearch();
    },
    [handleOpenCardSearch, modalManager]
  );

  const handleCloseCardSearchModal = useCallback(() => {
    handleCloseCardSearch();
    modalManager.handleCloseCardSearch();
  }, [handleCloseCardSearch, modalManager]);

  // ===== DECK LIST HANDLERS =====
  const handleShowFullSetList = useCallback(() => {
    modalManager.handleOpenDeckList([]);
  }, [modalManager]);

  const handleShowMissingCardsList = useCallback(() => {
    const missingCardsList = cards.filter((card) =>
      parsedMissingCards.has(card.number)
    );
    modalManager.handleOpenDeckList(missingCardsList);
  }, [cards, parsedMissingCards, modalManager]);

  // ===== SET SELECTION HANDLER =====
  const handleSetSelect = useCallback(
    async (selectedSetData) => {
      if (!currentBinder || currentBinder.binderType !== "set") {
        logger.warn("Can only select sets for set binders");
        return;
      }

      // Clear any previous errors
      setSetLoadingError(null);

      // Update the selected set in the cards hook
      setSelectedSetInHook(selectedSetData);

      // Update the binder to include this set in its sets array
      const updatedBinder = {
        ...currentBinder,
        sets: [selectedSetData], // For now, only support one set per binder
        updatedAt: new Date().toISOString(),
      };

      // Save the binder with the new set
      updateBinderState(updatedBinder);

      // Automatically load the set cards
      try {
        const result = await loadSetCards(selectedSetData, processCards);
        if (result.success) {
          logger.debug(
            "Set automatically loaded:",
            selectedSetData.name,
            "in binder:",
            currentBinder.name
          );
          setSetLoadingError(null); // Clear any previous errors
        } else {
          const errorMessage = result.error;
          setSetLoadingError(errorMessage);

          // Handle specific API errors
          if (
            errorMessage?.includes("quota") ||
            errorMessage?.includes("exceeded")
          ) {
            logger.error(
              "API quota exceeded. Please wait a moment before trying again."
            );
          } else {
            logger.error("Error loading set cards:", errorMessage);
          }
        }
      } catch (err) {
        const errorMessage = err.message;
        setSetLoadingError(errorMessage);
        logger.error("Error loading set cards:", err);
      }
    },
    [
      currentBinder,
      setSelectedSetInHook,
      updateBinderState,
      loadSetCards,
      processCards,
    ]
  );

  // ===== ENHANCED CARD HANDLERS WITH DEPENDENCIES =====
  const handleAddCard = useCallback(
    (card, position = null) => {
      const result = baseHandleAddCard(
        card,
        position,
        currentBinder,
        layout,
        urlState.currentPage
      );
      if (result.success && currentBinder?.binderType === "custom") {
        setCards(result.updatedCards);
        loadHistoryForBinder(currentBinder.id);
        updateBinderState({
          ...currentBinder,
          customCards: result.updatedCards,
        });
      }
      return result.success;
    },
    [
      baseHandleAddCard,
      currentBinder,
      layout,
      urlState.currentPage,
      setCards,
      loadHistoryForBinder,
      updateBinderState,
    ]
  );

  // Enhanced binder creation that auto-selects the new binder
  const handleBinderCreateAndSelect = useCallback(
    (name, binderType = "set") => {
      const newBinder = handleBinderCreate(name, binderType);
      if (newBinder) {
        // Automatically select the newly created binder
        handleBinderSelect(newBinder);
      }
      return newBinder;
    },
    [handleBinderCreate, handleBinderSelect]
  );

  const handleRemoveCard = useCallback(
    (cardIndex) => {
      const result = baseHandleRemoveCard(cardIndex, currentBinder);
      if (result.success && currentBinder?.binderType === "custom") {
        setCards(result.updatedCards);
        loadHistoryForBinder(currentBinder.id);
        updateBinderState({
          ...currentBinder,
          customCards: result.updatedCards,
        });
      }
    },
    [
      baseHandleRemoveCard,
      currentBinder,
      setCards,
      loadHistoryForBinder,
      updateBinderState,
    ]
  );

  const handleReorderCards = useCallback(
    (fromIndex, toIndex, isSwap = false) => {
      const result = baseHandleReorderCards(
        fromIndex,
        toIndex,
        isSwap,
        currentBinder
      );
      if (result.success && currentBinder?.binderType === "custom") {
        setCards(result.updatedCards);
        loadHistoryForBinder(currentBinder.id);
        updateBinderState({
          ...currentBinder,
          customCards: result.updatedCards,
        });
      }
    },
    [
      baseHandleReorderCards,
      currentBinder,
      setCards,
      loadHistoryForBinder,
      updateBinderState,
    ]
  );

  const handleMoveCards = useCallback(
    async (selectedCardData, targetPageIndex, moveOption) => {
      const result = await baseHandleMoveCards(
        selectedCardData,
        targetPageIndex,
        moveOption,
        currentBinder,
        layout
      );
      if (result.success) {
        setCards(result.updatedCards);
        loadHistoryForBinder(currentBinder.id);
        updateBinderState(result.updatedBinder);
      }
      return result.success;
    },
    [
      baseHandleMoveCards,
      currentBinder,
      layout,
      setCards,
      loadHistoryForBinder,
      updateBinderState,
    ]
  );

  // ===== OTHER ENHANCED HANDLERS =====
  const handleAddToCurrentPage = useCallback(
    (card) => {
      const result = baseHandleAddToCurrentPage(
        card,
        currentBinder,
        layout,
        urlState.currentPage
      );
      if (result.success && result.updatedCustomCards) {
        setCards(result.updatedCustomCards);
        loadHistoryForBinder(currentBinder.id);
        updateBinderState({
          ...currentBinder,
          customCards: result.updatedCustomCards,
        });
      }
      return result.success;
    },
    [
      baseHandleAddToCurrentPage,
      currentBinder,
      layout,
      urlState.currentPage,
      setCards,
      loadHistoryForBinder,
      updateBinderState,
    ]
  );

  const handleMoveFromClipboard = useCallback(
    (clipboardIndex, binderPosition, cardId, isReverseHolo) => {
      const result = baseHandleMoveFromClipboard(
        clipboardIndex,
        binderPosition,
        cardId,
        isReverseHolo,
        currentBinder
      );
      if (result.success && result.updatedCustomCards) {
        setCards(result.updatedCustomCards);
        loadHistoryForBinder(currentBinder.id);
        updateBinderState({
          ...currentBinder,
          customCards: result.updatedCustomCards,
        });
      }
      return result;
    },
    [
      baseHandleMoveFromClipboard,
      currentBinder,
      setCards,
      loadHistoryForBinder,
      updateBinderState,
    ]
  );

  const handleMissingCardsChange = useCallback(
    (e) => {
      baseHandleMissingCardsChange(
        e,
        set,
        rawCards,
        currentBinder,
        updateBinderState
      );
    },
    [
      baseHandleMissingCardsChange,
      set,
      rawCards,
      currentBinder,
      updateBinderState,
    ]
  );

  const handleToggleCardStatus = useCallback(
    (e, card) => {
      baseHandleToggleCardStatus(
        e,
        card,
        currentBinder,
        set,
        updateBinderState
      );
    },
    [baseHandleToggleCardStatus, currentBinder, set, updateBinderState]
  );

  // Create stable callback for handleNavigateToPage to prevent infinite loops
  const handleNavigateToPageCallback = useCallback(
    (targetPage) => {
      handleNavigateToPage(targetPage, handleCurrentPageChange);
    },
    [handleNavigateToPage, handleCurrentPageChange]
  );

  // Handle cards update when binder structure changes (e.g., adding pages)
  const handleCardsUpdate = useCallback(() => {
    if (currentBinder && currentBinder.binderType === "custom") {
      loadCustomCards(currentBinder.id);
    }
  }, [currentBinder, loadCustomCards]);

  // ===== CREATE CONTEXT VALUE =====
  const contextValue = {
    currentBinder,
    layout,
    urlState,
    binderHook,
    cardsHook,
    clipboardHook,
    historyHook,
    missingCardsHook,
    handleBinderSelect,
    handleCurrentPageChange,
    handleLayoutChange,
    handleClearBinder,
  };

  // ===== RENDER LOGIC =====
  if (binderValidation.status === "loading") {
    return <BinderLoader />;
  }

  if (binderValidation.status === "invalid") {
    return (
      <AppShell
        showSidebar={showSidebar}
        onToggleSidebar={setShowSidebar}
        headerProps={{
          currentBinder: null,
          set: null,
          cards: [],
          currentPage: 0,
          onCurrentPageChange: () => {},
          layout,
          progress: { totalCards: 0, collectedCount: 0, progressPercentage: 0 },
        }}
        sidebarProps={{
          binders,
          currentBinder: null,
          onBinderSelect: handleBinderSelect,
          onBinderCreate: handleBinderCreateAndSelect,
          onBinderDelete: handleBinderDeleteWithUrlClear,
          onBinderRename: handleBinderRename,
          selectedSet: null,
          onSetSelect: handleSetSelect,
          loading: false,
          setLoadingError: null,
          layout,
          onLayoutChange: handleLayoutChange,
          displayOptions,
          onDisplayOptionsChange: setDisplayOptions,
          missingCards: "",
          parsedMissingCards: new Set(),
          onMissingCardsChange: () => {},
          set: null,
          cards: [],
          onShowFullSetList: () => {},
          onShowMissingCardsList: () => {},
          onDataImported: handleDataImported,
          error: null,
        }}
      >
        <ErrorState
          error={binderValidation.error}
          onGoBack={handleClearBinder}
          showSuggestions={true}
        />
      </AppShell>
    );
  }

  return (
    <AppProvider value={contextValue}>
      <AppShell
        showSidebar={showSidebar}
        onToggleSidebar={setShowSidebar}
        headerProps={{
          currentBinder,
          set,
          cards,
          currentPage: urlState.currentPage,
          onCurrentPageChange: handleCurrentPageChange,
          layout,
          progress: calculateProgress(cards, currentBinder),
        }}
        sidebarProps={{
          binders,
          currentBinder,
          onBinderSelect: handleBinderSelect,
          onBinderCreate: handleBinderCreateAndSelect,
          onBinderDelete: handleBinderDeleteWithUrlClear,
          onBinderRename: handleBinderRename,
          selectedSet,
          onSetSelect: handleSetSelect,
          loading,
          setLoadingError,
          layout,
          onLayoutChange: handleLayoutChange,
          displayOptions,
          onDisplayOptionsChange: setDisplayOptions,
          missingCards,
          parsedMissingCards,
          onMissingCardsChange: handleMissingCardsChange,
          set,
          cards,
          onShowFullSetList: handleShowFullSetList,
          onShowMissingCardsList: handleShowMissingCardsList,
          onDataImported: handleDataImported,
          error,
        }}
      >
        <AppContent
          currentBinder={currentBinder}
          cards={cards}
          currentPage={urlState.currentPage}
          layout={layout}
          parsedMissingCards={parsedMissingCards}
          onShowSidebar={() => setShowSidebar(true)}
          onReorderCards={handleReorderCards}
          onRemoveCard={handleRemoveCard}
          onOpenCardSearch={handleOpenCardSearchModal}
          onMoveFromClipboard={handleMoveFromClipboard}
          onToggleCardStatus={handleToggleCardStatus}
          onMoveCards={handleMoveCards}
          onPageChange={handleCurrentPageChange}
          onCardsUpdate={handleCardsUpdate}
        />
      </AppShell>

      <AppModals
        modals={modalManager.modals}
        currentBinder={currentBinder}
        cards={cards}
        currentPage={urlState.currentPage}
        layout={layout}
        onCloseDeckList={modalManager.handleCloseDeckList}
        onCloseCardSearch={handleCloseCardSearchModal}
        onAddCard={handleAddCard}
        onAddToClipboard={handleAddToClipboard}
        clipboardCards={clipboardCards}
        isClipboardCollapsed={isClipboardCollapsed}
        onRemoveFromClipboard={handleRemoveFromClipboard}
        onAddToCurrentPage={handleAddToCurrentPage}
        onClearClipboard={handleClearClipboard}
        onToggleClipboard={handleToggleClipboard}
        historyEntries={historyEntries}
        isHistoryCollapsed={isHistoryCollapsed}
        onRevertToEntry={(entryId) => {
          const result = baseHandleRevertToEntry(currentBinder, entryId);
          if (result.success) {
            setCards(result.updatedCustomCards);
            updateBinderState({
              ...currentBinder,
              customCards: result.updatedCustomCards,
            });
          }
        }}
        onClearHistory={() => baseHandleClearHistory(currentBinder)}
        onNavigateHistory={(direction) => {
          const result = baseHandleNavigateHistory(currentBinder, direction);
          if (result.success) {
            setCards(result.updatedCustomCards);
            updateBinderState({
              ...currentBinder,
              customCards: result.updatedCustomCards,
            });
          }
        }}
        canNavigateBack={canNavigateBack(currentBinder)}
        canNavigateForward={canNavigateForward(currentBinder)}
        currentPosition={getCurrentPosition(currentBinder)}
        onToggleHistory={handleToggleHistory}
        onNavigateToPage={handleNavigateToPageCallback}
      />
    </AppProvider>
  );
};

export default App;

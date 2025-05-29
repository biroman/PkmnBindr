import CardSearchQuery from "../CardSearch/CardSearchQuery";
import DeckListModal from "../DeckListModal/DeckListModal";
import CardClipboard from "../CardClipboard/CardClipboard";
import BinderHistory from "../BinderHistory/BinderHistory";

/**
 * AppModals - Handles all modal rendering
 * Centralizes modal management and reduces clutter in main App
 * Now using React Query powered components for better performance
 */
const AppModals = ({
  modals,
  currentBinder,
  cards,
  currentPage,
  layout,
  // Modal handlers
  onCloseDeckList,
  onCloseCardSearch,
  onAddCard,
  onAddToClipboard,
  // Clipboard
  clipboardCards,
  isClipboardCollapsed,
  onRemoveFromClipboard,
  onAddToCurrentPage,
  onClearClipboard,
  onToggleClipboard,
  // History
  historyEntries,
  isHistoryCollapsed,
  onRevertToEntry,
  onClearHistory,
  onNavigateHistory,
  canNavigateBack,
  canNavigateForward,
  currentPosition,
  onToggleHistory,
  onNavigateToPage,
}) => {
  return (
    <>
      {/* Deck List Modal */}
      {modals.showDeckList && (
        <DeckListModal
          cards={
            modals.cardListToShow.length > 0 ? modals.cardListToShow : cards
          }
          onClose={onCloseDeckList}
        />
      )}

      {/* Card Search Modal - Now with React Query */}
      {modals.showCardSearch && (
        <CardSearchQuery
          isOpen={modals.showCardSearch}
          onClose={onCloseCardSearch}
          onAddCard={onAddCard}
          onAddToClipboard={onAddToClipboard}
        />
      )}

      {/* Card Clipboard - Only show for custom binders */}
      {currentBinder?.binderType === "custom" && (
        <CardClipboard
          clipboardCards={clipboardCards}
          onAddToClipboard={onAddToClipboard}
          onRemoveFromClipboard={onRemoveFromClipboard}
          onAddToCurrentPage={onAddToCurrentPage}
          onClearClipboard={onClearClipboard}
          currentPage={currentPage + 1}
          isCollapsed={isClipboardCollapsed}
          onToggleCollapse={onToggleClipboard}
        />
      )}

      {/* Binder History - Only show for custom binders */}
      {currentBinder?.binderType === "custom" && (
        <BinderHistory
          historyEntries={historyEntries}
          onRevertToEntry={onRevertToEntry}
          onClearHistory={onClearHistory}
          onNavigateHistory={onNavigateHistory}
          canNavigateBack={canNavigateBack}
          canNavigateForward={canNavigateForward}
          currentPosition={currentPosition}
          isCollapsed={isHistoryCollapsed}
          onToggleCollapse={onToggleHistory}
          onNavigateToPage={onNavigateToPage}
          cardsPerPage={layout.cards}
        />
      )}
    </>
  );
};

export default AppModals;

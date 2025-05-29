import BinderPage from "../BinderPage/BinderPage";
import CustomBinderPage from "../BinderPage/CustomBinderPage";
import { EmptyState } from "../AppLayout";

/**
 * AppContent - Handles main content area rendering
 * Determines what content to show based on current state
 */
const AppContent = ({
  currentBinder,
  cards,
  currentPage,
  layout,
  parsedMissingCards,
  onShowSidebar,
  // Custom binder handlers
  onReorderCards,
  onRemoveCard,
  onOpenCardSearch,
  onMoveFromClipboard,
  onToggleCardStatus,
  onMoveCards,
  onPageChange,
  onCardsUpdate,
}) => {
  // Show empty state only if no current binder
  if (!currentBinder) {
    return <EmptyState currentBinder={null} onShowSidebar={onShowSidebar} />;
  }

  // If we have a current binder, always render the appropriate binder page
  // (even if empty - the binder pages will handle empty states properly)

  // Render custom binder page
  if (currentBinder.binderType === "custom") {
    return (
      <CustomBinderPage
        cards={cards}
        currentPage={currentPage}
        layout={layout}
        onReorderCards={onReorderCards}
        onRemoveCard={onRemoveCard}
        onOpenCardSearch={onOpenCardSearch}
        onMoveFromClipboard={onMoveFromClipboard}
        parsedMissingCards={parsedMissingCards}
        onToggleCardStatus={onToggleCardStatus}
        onMoveCards={onMoveCards}
        onPageChange={onPageChange}
        currentBinder={currentBinder}
        onCardsUpdate={onCardsUpdate}
      />
    );
  }

  // Render regular binder page
  return (
    <BinderPage
      cards={cards}
      currentPage={currentPage}
      parsedMissingCards={parsedMissingCards}
      layout={layout}
      onToggleCardStatus={onToggleCardStatus}
    />
  );
};

export default AppContent;

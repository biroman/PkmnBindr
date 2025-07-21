import PropTypes from "prop-types";
import BinderDisplay from "./BinderDisplay";

const BinderCore = ({
  binder,
  currentPageConfig,
  dimensions,
  mode = "edit",
  backgroundColor = "#ffffff",
  getCardsForPage = () => [],
  onCardInteraction = {},
  dragHandlers = {},
  activeCard = null,
  className = "",
  style = {},
  reorderMode = "swap",
  children,
  // Public view specific props
  isPublicView = false,
  binderOwner = null,
  // QR code sharing props
  shareUrl = null,
  showQRCode = false,
  onToggleQRCode = null,
}) => {
  const {
    onCardClick = () => {},
    onCardDelete = () => {},
    onSlotClick = () => {},
    onToggleMissing = () => {},
    onToggleReverseHolo = () => {},
  } = onCardInteraction;

  const isReadOnly = mode === "readonly" || mode === "admin";
  const isDragDropEnabled = mode === "edit" && !isReadOnly;
  const isMobile = dimensions.isMobile;

  return (
    <div
      className={`relative ${isMobile ? "w-full h-full" : ""} ${className}`}
      style={style}
    >
      <BinderDisplay
        binder={binder}
        currentPageConfig={currentPageConfig}
        dimensions={dimensions}
        backgroundColor={backgroundColor}
        isReadOnly={isReadOnly}
        onCardClick={onCardClick}
        onCardDelete={isDragDropEnabled ? onCardDelete : undefined}
        onSlotClick={isDragDropEnabled ? onSlotClick : undefined}
        onToggleMissing={mode === "readonly" ? undefined : onToggleMissing}
        onToggleReverseHolo={isDragDropEnabled ? onToggleReverseHolo : undefined}
        getCardsForPage={getCardsForPage}
        reorderMode={reorderMode}
        // Public view specific props
        isPublicView={isPublicView}
        binderOwner={binderOwner}
        // QR code sharing props
        shareUrl={shareUrl}
        showQRCode={showQRCode}
        onToggleQRCode={onToggleQRCode}
      />
      {children}
    </div>
  );
};

BinderCore.propTypes = {
  binder: PropTypes.object.isRequired,
  currentPageConfig: PropTypes.shape({
    leftPage: PropTypes.shape({
      type: PropTypes.string.isRequired,
      pageNumber: PropTypes.number,
      cardPageIndex: PropTypes.number,
    }).isRequired,
    rightPage: PropTypes.shape({
      type: PropTypes.string.isRequired,
      pageNumber: PropTypes.number.isRequired,
      cardPageIndex: PropTypes.number.isRequired,
    }).isRequired,
  }).isRequired,
  dimensions: PropTypes.shape({
    width: PropTypes.number.isRequired,
    height: PropTypes.number.isRequired,
  }).isRequired,
  mode: PropTypes.oneOf(["edit", "readonly", "admin", "preview"]),
  backgroundColor: PropTypes.string,
  getCardsForPage: PropTypes.func,
  onCardInteraction: PropTypes.shape({
    onCardClick: PropTypes.func,
    onCardDelete: PropTypes.func,
    onSlotClick: PropTypes.func,
    onToggleMissing: PropTypes.func,
    onToggleReverseHolo: PropTypes.func,
  }),
  dragHandlers: PropTypes.shape({
    onDragStart: PropTypes.func,
    onDragEnd: PropTypes.func,
    onDragCancel: PropTypes.func,
    onDragOver: PropTypes.func,
  }),
  activeCard: PropTypes.object,
  className: PropTypes.string,
  style: PropTypes.object,
  reorderMode: PropTypes.string,
  children: PropTypes.node,
  // Public view specific props
  isPublicView: PropTypes.bool,
  binderOwner: PropTypes.object,
  // QR code sharing props
  shareUrl: PropTypes.string,
  showQRCode: PropTypes.bool,
  onToggleQRCode: PropTypes.func,
};

export default BinderCore;

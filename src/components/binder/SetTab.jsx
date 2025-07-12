import SetAddWizard from "./wizard/SetAddWizard";

const SetTab = ({ currentBinder, onAddCards, onSetAdded = () => {} }) => {
  return (
    <div className="h-full">
      <SetAddWizard
        currentBinder={currentBinder}
        onAddCards={onAddCards}
        onWizardComplete={onSetAdded}
      />
    </div>
  );
};

export default SetTab;

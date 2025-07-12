import { useState } from "react";
import SelectSetStep from "./SelectSetStep";
import ConfigureStep from "./ConfigureStep";
import ReviewStep from "./ReviewStep";
import { CheckCircleIcon } from "@heroicons/react/24/solid";

const SetAddWizard = ({ currentBinder, onAddCards, onWizardComplete }) => {
  const [step, setStep] = useState(1);
  const [selectedSet, setSelectedSet] = useState(null);
  const [configuration, setConfiguration] = useState({
    includeReverseHolos: false,
    placement: "interleaved",
  });

  const steps = [
    { id: 1, name: "Select Set", description: "Choose a set to add" },
    {
      id: 2,
      name: "Configure",
      description: "Adjust reverse holos & options",
    },
    { id: 3, name: "Review & Add", description: "Check capacity & confirm" },
  ];

  const handleSetSelect = (set) => {
    setSelectedSet(set);
    setStep(2);
  };

  const handleConfigChange = (newConfig) => {
    setConfiguration((prev) => ({ ...prev, ...newConfig }));
  };

  const handleProceedToReview = () => {
    setStep(3);
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleConfirm = () => {
    onWizardComplete();
  };

  const handleReset = () => {
    setSelectedSet(null);
    setStep(1);
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return <SelectSetStep onSetSelect={handleSetSelect} />;
      case 2:
        return (
          <ConfigureStep
            selectedSet={selectedSet}
            configuration={configuration}
            onConfigChange={handleConfigChange}
            onProceed={handleProceedToReview}
            onBack={handleReset}
          />
        );
      case 3:
        return (
          <ReviewStep
            selectedSet={selectedSet}
            configuration={configuration}
            currentBinder={currentBinder}
            onAddCards={onAddCards}
            onConfirm={handleConfirm}
            onBack={handleBack}
          />
        );
      default:
        return <SelectSetStep onSetSelect={handleSetSelect} />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-card-background text-primary">
      {/* Header with Step Indicator */}
      <div className="px-4 py-3 border-b border-border">
        <nav aria-label="Progress">
          <ol role="list" className="flex items-center">
            {steps.map((s, stepIdx) => (
              <li
                key={s.name}
                className={`relative ${
                  stepIdx !== steps.length - 1 ? "pr-8 sm:pr-20" : ""
                }`}
              >
                {step > s.id ? (
                  <>
                    <div
                      className="absolute inset-0 flex items-center"
                      aria-hidden="true"
                    >
                      <div className="h-0.5 w-full bg-blue-600" />
                    </div>
                    <button
                      onClick={() => setStep(s.id)}
                      className="relative w-8 h-8 flex items-center justify-center bg-blue-600 rounded-full hover:bg-blue-700"
                    >
                      <CheckCircleIcon
                        className="w-5 h-5 text-white"
                        aria-hidden="true"
                      />
                      <span className="sr-only">{s.name}</span>
                    </button>
                  </>
                ) : step === s.id ? (
                  <>
                    <div
                      className="absolute inset-0 flex items-center"
                      aria-hidden="true"
                    >
                      <div className="h-0.5 w-full bg-gray-200 dark:bg-gray-700" />
                    </div>
                    <div
                      className="relative w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-800 border-2 border-blue-600 rounded-full"
                      aria-current="step"
                    >
                      <span
                        className="h-2.5 w-2.5 bg-blue-600 rounded-full"
                        aria-hidden="true"
                      />
                      <span className="sr-only">{s.name}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div
                      className="absolute inset-0 flex items-center"
                      aria-hidden="true"
                    >
                      <div className="h-0.5 w-full bg-gray-200 dark:bg-gray-700" />
                    </div>
                    <div className="group relative w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-800 border-2 border-gray-300 dark:border-gray-600 rounded-full">
                      <span
                        className="h-2.5 w-2.5 bg-transparent rounded-full"
                        aria-hidden="true"
                      />
                      <span className="sr-only">{s.name}</span>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ol>
        </nav>
      </div>

      <div className="flex-1 p-4 sm:p-6 overflow-y-auto">{renderStep()}</div>
    </div>
  );
};

export default SetAddWizard;

import { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import {
  ExclamationTriangleIcon,
  CloudArrowUpIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

const LogoutConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  unsavedBinders = [],
  isLoggingOut = false,
}) => {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                      <ExclamationTriangleIcon className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <Dialog.Title
                        as="h3"
                        className="text-lg font-semibold text-gray-900"
                      >
                        Unsaved Changes
                      </Dialog.Title>
                      <p className="text-sm text-gray-600">
                        Some binders haven't been saved to the cloud
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors"
                    disabled={isLoggingOut}
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>

                {/* Content */}
                <div className="mb-6">
                  <p className="text-gray-700 mb-4">
                    You have <strong>{unsavedBinders.length}</strong> binder
                    {unsavedBinders.length !== 1 ? "s" : ""} with unsaved
                    changes:
                  </p>

                  {/* Binder List */}
                  <div className="bg-gray-50 rounded-lg p-3 max-h-40 overflow-y-auto">
                    <div className="space-y-2">
                      {unsavedBinders.map((binder, index) => (
                        <div
                          key={binder.id}
                          className="flex items-center gap-3 p-2 bg-white rounded-lg border border-gray-200"
                        >
                          <div className="flex-shrink-0 w-2 h-2 bg-amber-400 rounded-full"></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {binder.metadata?.name || "Unnamed Binder"}
                            </p>
                            <p className="text-xs text-gray-500">
                              {Object.keys(binder.cards || {}).length} cards
                            </p>
                          </div>
                          <CloudArrowUpIcon className="w-4 h-4 text-gray-400" />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-800">
                      <strong>Important:</strong> These changes will be lost
                      after logout. Consider saving them to the cloud first to
                      keep your progress.
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={onClose}
                    disabled={isLoggingOut}
                    className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
                  >
                    Save First
                  </button>
                  <button
                    onClick={onConfirm}
                    disabled={isLoggingOut}
                    className="flex-1 px-4 py-2.5 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
                  >
                    {isLoggingOut ? "Logging out..." : "Logout Anyway"}
                  </button>
                </div>

                {/* Help text */}
                <p className="text-xs text-gray-500 text-center mt-3">
                  You can save binders to the cloud from the binders page
                </p>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default LogoutConfirmationModal;

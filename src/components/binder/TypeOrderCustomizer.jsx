import { useState, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";
import { XMarkIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  getAllTypes,
  getTypeDisplayInfo,
  setCustomTypeOrder,
  resetTypeOrder,
} from "../../utils/binderSorting";
import { toast } from "react-hot-toast";

// Sortable Type Item Component
const SortableTypeItem = ({ typeName, index, isDragOverlay = false }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: typeName,
    transition: {
      duration: 150, // Faster transitions
      easing: "cubic-bezier(0.25, 1, 0.5, 1)",
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? "none" : transition, // Disable transition while dragging
  };

  const typeInfo = getTypeDisplayInfo(typeName);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        flex items-center gap-3 p-3 rounded-lg border cursor-move
        ${
          isDragging || isDragOverlay
            ? "shadow-lg border-blue-400 bg-white z-50 opacity-90"
            : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
        }
      `}
      {...attributes}
      {...listeners}
    >
      {/* Drag Handle */}
      <div className="flex flex-col gap-1 pointer-events-none">
        <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
        <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
        <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
      </div>

      {/* Position Number */}
      <div className="flex items-center justify-center w-6 h-6 bg-gray-100 text-gray-600 text-sm font-medium rounded pointer-events-none">
        {index + 1}
      </div>

      {/* Type Badge with Icon */}
      <div className="flex-1 flex items-center gap-3 px-3 py-2 pointer-events-none">
        {/* Type Icon */}
        <img
          src={typeInfo.iconPath}
          alt={`${typeName} type`}
          className="w-6 h-6 flex-shrink-0 object-contain"
          onError={(e) => {
            // Fallback to a colored circle if icon fails to load
            e.target.style.display = "none";
            e.target.nextElementSibling.style.display = "block";
          }}
        />

        {/* Fallback colored circle (hidden by default) */}
        <div
          className="w-6 h-6 flex-shrink-0 rounded-full border-2 border-white shadow-sm hidden"
          style={{ backgroundColor: typeInfo.colors.bg }}
        ></div>

        {/* Type Name with Background */}
        <div
          className="flex-1 px-3 py-1 rounded-md text-sm font-medium text-center"
          style={{
            backgroundColor: typeInfo.colors.bg,
            color: typeInfo.colors.text,
          }}
        >
          {typeName}
        </div>
      </div>
    </div>
  );
};

const TypeOrderCustomizer = ({ isOpen, onClose, onOrderChanged }) => {
  const [types, setTypes] = useState([]);
  const [hasChanges, setHasChanges] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Start drag after 5px movement
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (isOpen) {
      setTypes(getAllTypes());
      setHasChanges(false);
    }
  }, [isOpen]);

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setTypes((items) => {
        const oldIndex = items.indexOf(active.id);
        const newIndex = items.indexOf(over.id);

        const newTypes = arrayMove(items, oldIndex, newIndex);
        setHasChanges(true);
        return newTypes;
      });
    }
  };

  const handleSave = () => {
    // Create new hierarchy object
    const newHierarchy = {};
    types.forEach((type, index) => {
      newHierarchy[type] = index + 1;
    });

    setCustomTypeOrder(newHierarchy);
    setHasChanges(false);
    onOrderChanged?.();
    toast.success("Type order saved!", { icon: "✨" });
    onClose();
  };

  const handleReset = () => {
    resetTypeOrder();
    setTypes(getAllTypes());
    setHasChanges(false);
    onOrderChanged?.();
    toast.success("Type order reset to default", { icon: "🔄" });
  };

  const handleCancel = () => {
    if (hasChanges) {
      // Reset to original order
      setTypes(getAllTypes());
      setHasChanges(false);
    }
    onClose();
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleCancel}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white text-left align-middle shadow-xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <div>
                    <Dialog.Title className="text-lg font-medium text-gray-900">
                      Customize Type Order
                    </Dialog.Title>
                    <p className="text-sm text-gray-500 mt-1">
                      Drag to reorder Pokemon types for sorting
                    </p>
                  </div>
                  <button
                    onClick={handleCancel}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <XMarkIcon className="w-5 h-5 text-gray-400" />
                  </button>
                </div>

                {/* Type List */}
                <div className="p-6">
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                    measuring={{
                      droppable: {
                        strategy: "always",
                      },
                    }}
                  >
                    <SortableContext
                      items={types}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-2">
                        {types.map((typeName, index) => (
                          <SortableTypeItem
                            key={typeName}
                            typeName={typeName}
                            index={index}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
                  <button
                    onClick={handleReset}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ArrowPathIcon className="w-4 h-4" />
                    Reset to Default
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCancel}
                      className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={!hasChanges}
                      className={`
                        px-4 py-2 text-sm font-medium rounded-lg transition-colors
                        ${
                          hasChanges
                            ? "bg-blue-600 text-white hover:bg-blue-700"
                            : "bg-gray-300 text-gray-500 cursor-not-allowed"
                        }
                      `}
                    >
                      Save Order
                    </button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default TypeOrderCustomizer;

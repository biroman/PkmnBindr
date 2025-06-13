import { PencilIcon } from "@heroicons/react/24/outline";

const EditButton = ({ onClick, className = "", size = "sm" }) => {
  const sizeClasses = {
    xs: "w-3 h-3",
    sm: "w-4 h-4",
    md: "w-5 h-5",
  };

  return (
    <button
      onClick={onClick}
      className={`p-1 text-gray-800 hover:text-gray-600 hover:bg-gray-100 rounded transition-all ${className}`}
      title="Edit"
    >
      <PencilIcon className={sizeClasses[size]} />
    </button>
  );
};

export default EditButton;

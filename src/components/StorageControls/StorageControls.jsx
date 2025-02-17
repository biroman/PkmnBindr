import { useState, useRef } from "react";
import PropTypes from "prop-types";
import { Save, Upload, Check, AlertCircle } from "lucide-react";
import { exportBinderData, importBinderData } from "../../utils/storageUtils";

const StorageControls = ({ onDataImported }) => {
  const [importStatus, setImportStatus] = useState(null);
  const fileInputRef = useRef(null);

  const handleImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const success = await importBinderData(file);
    setImportStatus(success ? "success" : "error");

    if (success && onDataImported) {
      onDataImported();
    }

    // Reset after 3 seconds
    setTimeout(() => {
      setImportStatus(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }, 3000);
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={exportBinderData}
        className="px-3 py-1.5 bg-gray-800 text-yellow-500 text-sm rounded-lg 
        hover:bg-gray-700 border border-yellow-500/20
        focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:ring-offset-gray-900
        transition-colors duration-200
        flex items-center gap-2"
      >
        <Save className="w-4 h-4" />
        Export
      </button>

      <div className="relative">
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImport}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <button
          className="px-3 py-1.5 bg-gray-800 text-yellow-500 text-sm rounded-lg 
          hover:bg-gray-700 border border-yellow-500/20
          focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:ring-offset-gray-900
          transition-colors duration-200
          flex items-center gap-2"
        >
          {importStatus === "success" ? (
            <Check className="w-4 h-4 text-green-500" />
          ) : importStatus === "error" ? (
            <AlertCircle className="w-4 h-4 text-red-500" />
          ) : (
            <Upload className="w-4 h-4" />
          )}
          Import
        </button>
      </div>
    </div>
  );
};

StorageControls.propTypes = {
  onDataImported: PropTypes.func,
};

export default StorageControls;

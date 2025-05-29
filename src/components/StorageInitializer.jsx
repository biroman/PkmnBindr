import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { initializeStorageSystem } from "../utils/storageInit";
import logger from "../utils/logger";

const StorageInitializer = ({ children }) => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [initializationError, setInitializationError] = useState(null);
  const [migrationStatus, setMigrationStatus] = useState("");

  useEffect(() => {
    const initializeStorage = async () => {
      try {
        setMigrationStatus("Initializing storage system...");
        logger.info("Starting storage system initialization");

        // Add a timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Storage initialization timeout")),
            10000
          )
        );

        const initPromise = initializeStorageSystem();

        const success = await Promise.race([initPromise, timeoutPromise]);

        if (success) {
          setMigrationStatus("Storage initialized successfully!");
          logger.info("Storage system ready");

          // Small delay to show the success message
          setTimeout(() => {
            setIsInitializing(false);
          }, 500);
        } else {
          throw new Error("Storage initialization failed");
        }
      } catch (error) {
        logger.error("Storage initialization error:", error);
        setInitializationError(error);
        setMigrationStatus(
          "Storage initialization failed - continuing with localStorage"
        );

        // Allow the app to load even if storage init fails
        setTimeout(() => {
          setIsInitializing(false);
        }, 1500);
      }
    };

    initializeStorage();
  }, []);

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md mx-4">
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <svg
                className="w-8 h-8 text-blue-600 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Pokemon Binder
            </h2>
            <p className="text-gray-600">{migrationStatus}</p>
          </div>

          {initializationError && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-yellow-400"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-800">
                    There was an issue with storage initialization, but the app
                    will continue to work with localStorage.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6">
            <div className="bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
                style={{ width: initializationError ? "100%" : "85%" }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return children;
};

StorageInitializer.propTypes = {
  children: PropTypes.node.isRequired,
};

export default StorageInitializer;

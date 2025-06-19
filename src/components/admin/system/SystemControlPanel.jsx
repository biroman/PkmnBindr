import React from "react";
import { Button } from "../../ui/Button";
import {
  ShieldCheckIcon,
  CpuChipIcon,
  ServerIcon,
} from "@heroicons/react/24/outline";

const SystemControlPanel = ({
  user,
  onCopyUserId,
  onSetupBinderLimits,
  onMigrateUsers,
}) => {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          System Configuration
        </h2>

        {/* Owner Setup Section */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6 mb-6">
          <h3 className="text-lg font-semibold text-green-800 mb-4 flex items-center gap-2">
            <ShieldCheckIcon className="w-6 h-6" />
            Owner & Security Setup
          </h3>

          <div className="bg-white rounded-lg p-4 border border-green-200 mb-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-700">
                Your User ID:
              </span>
              <div className="flex items-center gap-2">
                <code className="bg-gray-100 px-3 py-1 rounded-md text-sm font-mono text-gray-800">
                  {user?.uid || "Not available"}
                </code>
                <Button size="sm" variant="outline" onClick={onCopyUserId}>
                  Copy
                </Button>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={onSetupBinderLimits}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                size="sm"
              >
                📁 Setup Binder Limits
              </Button>

              <Button
                onClick={onMigrateUsers}
                className="bg-orange-600 hover:bg-orange-700 text-white"
                size="sm"
              >
                🔄 Migrate User Data
              </Button>
            </div>
          </div>

          <div className="text-sm text-green-700 space-y-1">
            <p>
              🛡️ If you're getting permission errors, click "Setup Owner Role"
              once
            </p>
            <p>
              📁 Click "Setup Binder Limits" to initialize default limits (5
              binders, 500 cards)
            </p>
          </div>
        </div>

        {/* System Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-50 rounded-lg p-6">
            <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <CpuChipIcon className="w-5 h-5" />
              System Information
            </h4>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Environment:</span>
                <span className="font-medium">Production</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Database:</span>
                <span className="font-medium">Firebase Firestore</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Authentication:</span>
                <span className="font-medium">Firebase Auth</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Storage:</span>
                <span className="font-medium">Firebase Storage</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-6">
            <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <ServerIcon className="w-5 h-5" />
              Performance Metrics
            </h4>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Cache Hit Rate:</span>
                <span className="font-medium text-green-600">95%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Response Time:</span>
                <span className="font-medium text-green-600">&lt;200ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Uptime:</span>
                <span className="font-medium text-green-600">99.9%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Error Rate:</span>
                <span className="font-medium text-green-600">&lt;0.1%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemControlPanel;

import { useState } from "react";
import { useRuleEnforcement } from "../../hooks/useRuleEnforcement";
import { Button } from "../ui/Button";
import { Alert } from "../ui/Alert";

/**
 * Example component demonstrating how to use the rules system
 * This shows how to check permissions before actions and track usage
 */
const RulesExample = () => {
  const {
    checkApiLimit,
    checkSearchLimit,
    checkCanCreateCollection,
    checkFileUpload,
    performApiCall,
    performSearch,
  } = useRuleEnforcement();

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const addResult = (message, type = "info") => {
    setResults((prev) => [
      ...prev,
      {
        id: Date.now(),
        message,
        type,
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);
  };

  // Example: Check API rate limit
  const handleCheckApiLimit = async () => {
    setLoading(true);
    try {
      const result = await checkApiLimit();
      if (result.allowed) {
        addResult("✅ API call allowed", "success");
        if (result.remaining !== undefined) {
          addResult(`Remaining calls: ${result.remaining}`, "info");
        }
      } else {
        addResult(`❌ API call blocked: ${result.reason}`, "error");
      }
    } catch (error) {
      addResult(`Error checking API limit: ${error.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  // Example: Check search limit
  const handleCheckSearchLimit = async () => {
    setLoading(true);
    try {
      const result = await checkSearchLimit();
      if (result.allowed) {
        addResult("✅ Search allowed", "success");
      } else {
        addResult(`❌ Search blocked: ${result.reason}`, "error");
      }
    } catch (error) {
      addResult(`Error checking search limit: ${error.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  // Example: Check collection creation limit
  const handleCheckCollectionLimit = async () => {
    setLoading(true);
    try {
      // Simulate user currently has 5 collections
      const currentCollectionCount = 5;
      const result = await checkCanCreateCollection(currentCollectionCount);

      if (result.allowed) {
        addResult("✅ Can create new collection", "success");
      } else {
        addResult(`❌ Cannot create collection: ${result.reason}`, "error");
      }
    } catch (error) {
      addResult(`Error checking collection limit: ${error.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  // Example: Check file upload
  const handleCheckFileUpload = async () => {
    setLoading(true);
    try {
      // Simulate a file upload
      const mockFile = {
        size: 2 * 1024 * 1024, // 2MB
        type: "image/jpeg",
      };

      const result = await checkFileUpload(mockFile);

      if (result.allowed) {
        addResult("✅ File upload allowed", "success");
      } else {
        addResult(`❌ File upload blocked: ${result.reason}`, "error");
      }
    } catch (error) {
      addResult(`Error checking file upload: ${error.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  // Example: Perform API call with automatic tracking
  const handlePerformApiCall = async () => {
    setLoading(true);
    try {
      // Mock API function
      const mockApiCall = async () => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return { data: "Sample API response" };
      };

      const result = await performApiCall(mockApiCall);
      addResult("✅ API call completed and tracked", "success");
      addResult(`Response: ${JSON.stringify(result)}`, "info");
    } catch (error) {
      addResult(`❌ API call failed: ${error.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  // Example: Perform search with automatic tracking
  const handlePerformSearch = async () => {
    setLoading(true);
    try {
      // Mock search function
      const mockSearch = async (query) => {
        await new Promise((resolve) => setTimeout(resolve, 800));
        return { results: [`Result for "${query}"`] };
      };

      const result = await performSearch(mockSearch, "pikachu");
      addResult("✅ Search completed and tracked", "success");
      addResult(`Results: ${JSON.stringify(result)}`, "info");
    } catch (error) {
      addResult(`❌ Search failed: ${error.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const clearResults = () => {
    setResults([]);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Rules System Demo
        </h2>
        <p className="text-gray-600">
          This component demonstrates how to use the rules system to check
          permissions and track usage throughout your application.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <Button
          onClick={handleCheckApiLimit}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Check API Limit
        </Button>

        <Button
          onClick={handleCheckSearchLimit}
          disabled={loading}
          className="bg-green-600 hover:bg-green-700"
        >
          Check Search Limit
        </Button>

        <Button
          onClick={handleCheckCollectionLimit}
          disabled={loading}
          className="bg-purple-600 hover:bg-purple-700"
        >
          Check Collection Limit
        </Button>

        <Button
          onClick={handleCheckFileUpload}
          disabled={loading}
          className="bg-orange-600 hover:bg-orange-700"
        >
          Check File Upload
        </Button>

        <Button
          onClick={handlePerformApiCall}
          disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          Perform API Call
        </Button>

        <Button
          onClick={handlePerformSearch}
          disabled={loading}
          className="bg-pink-600 hover:bg-pink-700"
        >
          Perform Search
        </Button>
      </div>

      {/* Clear Results Button */}
      <div className="mb-4">
        <Button
          onClick={clearResults}
          variant="outline"
          disabled={loading || results.length === 0}
        >
          Clear Results
        </Button>
      </div>

      {/* Loading Indicator */}
      {loading && (
        <div className="mb-4 text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Processing...</p>
        </div>
      )}

      {/* Results Display */}
      <div className="space-y-3">
        {results.map((result) => (
          <div
            key={result.id}
            className={`p-3 rounded border-l-4 ${
              result.type === "success"
                ? "bg-green-50 border-green-500"
                : result.type === "error"
                ? "bg-red-50 border-red-500"
                : "bg-blue-50 border-blue-500"
            }`}
          >
            <div className="flex justify-between items-start">
              <p
                className={`text-sm ${
                  result.type === "success"
                    ? "text-green-800"
                    : result.type === "error"
                    ? "text-red-800"
                    : "text-blue-800"
                }`}
              >
                {result.message}
              </p>
              <span className="text-xs text-gray-500">{result.timestamp}</span>
            </div>
          </div>
        ))}

        {results.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>
              No results yet. Try clicking one of the buttons above to test the
              rules system.
            </p>
          </div>
        )}
      </div>

      {/* Usage Instructions */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          How to Use in Your Components
        </h3>
        <div className="text-sm text-gray-700 space-y-2">
          <p>
            <strong>1. Import the hook:</strong>
          </p>
          <code className="block bg-gray-200 p-2 rounded text-xs">
            import useRuleEnforcement from '../hooks/useRuleEnforcement';
          </code>

          <p>
            <strong>2. Use in your component:</strong>
          </p>
          <code className="block bg-gray-200 p-2 rounded text-xs">
            {`const { checkApiLimit, performApiCall } = useRuleEnforcement();`}
          </code>

          <p>
            <strong>3. Check before actions:</strong>
          </p>
          <code className="block bg-gray-200 p-2 rounded text-xs">
            {`const result = await checkApiLimit();
if (!result.allowed) {
  alert(result.reason);
  return;
}`}
          </code>

          <p>
            <strong>4. Or use combined operations:</strong>
          </p>
          <code className="block bg-gray-200 p-2 rounded text-xs">
            {`try {
  const data = await performApiCall(apiFunction);
  // API call was allowed and usage was tracked
} catch (error) {
  // Handle rate limit or API errors
}`}
          </code>
        </div>
      </div>
    </div>
  );
};

export default RulesExample;

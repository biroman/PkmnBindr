import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import useSetSearch from "../../../hooks/useSetSearch";
import { Disclosure, Transition } from "@headlessui/react";
import { ChevronRightIcon } from "@heroicons/react/24/solid";
import { useState } from "react";

const SetCardSkeleton = () => (
  <div className="bg-card-background rounded-xl border border-border p-4">
    <div className="flex items-start gap-3 animate-pulse">
      <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
      </div>
      <div className="w-10 h-5 bg-slate-200 dark:bg-slate-700 rounded-md"></div>
    </div>
    <div className="mt-4 h-5 bg-slate-200 dark:bg-slate-700 rounded w-1/4"></div>
  </div>
);

const SelectSetStep = ({ onSetSelect }) => {
  const {
    isLoading,
    error,
    searchQuery,
    updateSearchQuery,
    filteredCount,
    totalSets,
    groupedSets,
  } = useSetSearch();
  const [openSeries, setOpenSeries] = useState({});

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <div className="text-red-800 dark:text-red-200 font-medium">
          Error Loading Sets
        </div>
        <div className="text-red-600 dark:text-red-400 text-sm">{error}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search & Controls */}
      <div className="pb-4 space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-primary dark:text-slate-100">
          Step 1: Select a Set
        </h2>
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => updateSearchQuery(e.target.value)}
            placeholder="Search sets by name or series..."
            className="w-full pl-10 pr-4 py-2.5 text-base border-border dark:bg-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-lg"
          />
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500 dark:text-slate-400">
            Showing{" "}
            <span className="font-medium text-primary dark:text-slate-300">
              {filteredCount}
            </span>{" "}
            of{" "}
            <span className="font-medium text-primary dark:text-slate-300">
              {totalSets}
            </span>{" "}
            sets
          </span>
          {searchQuery && (
            <button
              onClick={() => updateSearchQuery("")}
              className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Accordion List of Sets */}
      <div className="flex-1 overflow-y-auto -mx-4 sm:-mx-6 px-4 sm:px-6 pt-4 space-y-2">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(8)].map((_, i) => (
              <SetCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredCount === 0 ? (
          <div className="text-center py-16">
            <div className="text-slate-400 dark:text-slate-500 font-medium mb-2">
              No matching sets found
            </div>
            <div className="text-secondary text-sm">
              Try adjusting your search terms.
            </div>
          </div>
        ) : (
          Object.entries(groupedSets).map(([series, setsInSeries]) => (
            <Disclosure key={series} as="div" className="w-full">
              {({ open }) => (
                <>
                  <Disclosure.Button className="flex w-full justify-between items-center rounded-lg bg-slate-100 dark:bg-slate-800 px-4 py-3 text-left text-sm font-medium text-primary hover:bg-slate-200 dark:hover:bg-slate-700 focus:outline-none focus-visible:ring focus-visible:ring-blue-500 focus-visible:ring-opacity-75">
                    <span>
                      {series} ({setsInSeries.length})
                    </span>
                    <ChevronRightIcon
                      className={`${
                        open ? "rotate-90 transform" : ""
                      } h-5 w-5 text-slate-500 transition-transform`}
                    />
                  </Disclosure.Button>
                  <Transition
                    enter="transition duration-100 ease-out"
                    enterFrom="transform scale-95 opacity-0"
                    enterTo="transform scale-100 opacity-100"
                    leave="transition duration-75 ease-out"
                    leaveFrom="transform scale-100 opacity-100"
                    leaveTo="transform scale-95 opacity-0"
                  >
                    <Disclosure.Panel
                      as="div"
                      className="px-2 pt-2 pb-2 text-sm text-gray-500"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                        {setsInSeries.map((set) => (
                          <div
                            key={set.id}
                            onClick={() => onSetSelect(set)}
                            className="group relative bg-card-background dark:bg-slate-800/50 rounded-xl border border-border dark:border-slate-700/80 transition-all duration-200 hover:shadow-xl hover:border-blue-500 dark:hover:border-blue-500 hover:scale-[1.02] cursor-pointer"
                          >
                            <div className="p-4">
                              <div className="flex items-start gap-4">
                                <div className="flex-shrink-0 w-14 h-14 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center overflow-hidden p-1">
                                  <img
                                    src={set.images?.symbol || ""}
                                    alt={`${set.name} symbol`}
                                    className="max-w-full max-h-full object-contain"
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-semibold text-primary dark:text-slate-100 text-base leading-tight truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                                    {set.name}
                                  </h3>
                                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 truncate">
                                    {set.series}
                                  </p>
                                </div>
                                {set.releaseDate && (
                                  <div className="flex-shrink-0">
                                    <span className="inline-block bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium px-2 py-1 rounded-full">
                                      {new Date(set.releaseDate).getFullYear()}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="px-4 pb-4 flex justify-between items-center">
                              <span className="text-sm font-medium text-primary dark:text-slate-300">
                                {set.total} cards
                              </span>
                              <span className="text-xs text-slate-500 dark:text-slate-500">
                                {set.id.toUpperCase()}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Disclosure.Panel>
                  </Transition>
                </>
              )}
            </Disclosure>
          ))
        )}
      </div>
    </div>
  );
};

export default SelectSetStep;

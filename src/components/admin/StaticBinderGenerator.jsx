import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { useBinderContext } from "../../contexts/BinderContext";
import { Button } from "../ui/Button";
import {
  DocumentArrowDownIcon,
  GlobeAltIcon,
  EyeIcon,
  CogIcon,
  CheckCircleIcon,
  XCircleIcon,
  LinkIcon,
  TagIcon,
  PencilIcon,
} from "@heroicons/react/24/outline";

const StaticBinderGenerator = () => {
  const { binders, exportBinderData } = useBinderContext();
  const [selectedBinders, setSelectedBinders] = useState(new Set());
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedBinders, setGeneratedBinders] = useState([]);
  const [binderOptions, setBinderOptions] = useState({});

  // Load existing static binders on mount
  useEffect(() => {
    loadExistingStaticBinders();
  }, []);

  const loadExistingStaticBinders = async () => {
    try {
      const response = await fetch("/static-binders/index.json");
      if (response.ok) {
        const data = await response.json();
        setGeneratedBinders(data.binders || []);
      }
    } catch (error) {
      console.log("No existing static binders found");
    }
  };

  const generateSlug = (name) => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const toggleBinderSelection = (binderId) => {
    const newSelected = new Set(selectedBinders);
    if (newSelected.has(binderId)) {
      newSelected.delete(binderId);
      // Remove from options when deselected
      const newOptions = { ...binderOptions };
      delete newOptions[binderId];
      setBinderOptions(newOptions);
    } else {
      newSelected.add(binderId);
      // Add default options when selected
      const binder = binders.find((b) => b.id === binderId);
      if (binder) {
        setBinderOptions((prev) => ({
          ...prev,
          [binderId]: {
            featured: false,
            customSlug: generateSlug(binder.metadata.name),
            seoTitle: `${binder.metadata.name} | Pokemon Card Collection`,
            seoDescription:
              binder.metadata.description ||
              `Explore this amazing Pokemon card collection featuring ${
                Object.keys(binder.cards || {}).length
              } cards.`,
            tags: [],
            category: "",
          },
        }));
      }
    }
    setSelectedBinders(newSelected);
  };

  const updateBinderOptions = (binderId, field, value) => {
    setBinderOptions((prev) => ({
      ...prev,
      [binderId]: {
        ...prev[binderId],
        [field]: value,
      },
    }));
  };

  const handleGenerateStatic = async () => {
    if (selectedBinders.size === 0) {
      toast.error("Please select at least one binder");
      return;
    }

    setIsGenerating(true);

    try {
      const bindersData = [];
      const staticBinders = [];

      // Get each selected binder's data
      for (const binderId of selectedBinders) {
        try {
          console.log("Getting binder data:", binderId);

          // Find the binder in the binders array
          const binderData = binders.find((b) => b.id === binderId);

          if (!binderData) {
            console.error("Binder not found in binders array:", binderId);
            toast.error(`Binder ${binderId} not found`);
            continue;
          }

          if (!binderData.metadata) {
            console.error("Binder missing metadata:", binderData);
            toast.error(`Binder ${binderId} has invalid metadata`);
            continue;
          }

          console.log(
            "Successfully found binder:",
            binderData.metadata?.name || binderId
          );
          bindersData.push(binderData);
        } catch (error) {
          console.error("Error getting binder data:", binderId, error);
          toast.error(`Failed to get binder ${binderId}: ${error.message}`);
          continue;
        }
      }

      if (bindersData.length === 0) {
        toast.error("No binders were successfully exported");
        return;
      }

      // Generate static binder files
      bindersData.forEach((binderData, index) => {
        try {
          console.log(
            `Processing binder ${index + 1}/${bindersData.length}:`,
            binderData.metadata?.name
          );

          if (!binderData || !binderData.id) {
            console.error("Invalid binder data at index", index, binderData);
            return;
          }

          const options = binderOptions[binderData.id] || {};
          const staticBinder = generateStaticBinder(binderData, options);
          staticBinders.push(staticBinder);

          console.log("Generated static binder:", staticBinder.slug);
        } catch (error) {
          console.error("Error generating static binder:", error, binderData);
          toast.error(
            `Failed to process binder: ${
              binderData?.metadata?.name || "Unknown"
            }`
          );
        }
      });

      // Create index file
      const indexData = {
        binders: staticBinders.map((binder) => ({
          id: binder.id,
          slug: binder.slug,
          name: binder.metadata.name,
          description: binder.metadata.description,
          featured: binder.metadata.featured,
          category: binder.metadata.category,
          tags: binder.metadata.tags,
          statistics: binder.metadata.statistics,
          seo: binder.seo,
          lastUpdated: binder.generatedAt,
        })),
        lastUpdated: new Date().toISOString(),
        count: staticBinders.length,
      };

      // Create a ZIP file with all the static files
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      // Add individual binder files
      staticBinders.forEach((binder) => {
        zip.file(`${binder.slug}.json`, JSON.stringify(binder, null, 2));
      });

      // Add index file
      zip.file("index.json", JSON.stringify(indexData, null, 2));

      // Generate sitemap entries for easy copy-paste
      const sitemapEntries = staticBinders
        .map(
          (binder) => `  <url>
            <loc>https://www.pkmnbindr.com/binders/${binder.slug}</loc>
    <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>`
        )
        .join("\n");

      // Add README with instructions
      const readme = `# Static Binder Files

Generated on: ${new Date().toLocaleString()}
Total binders: ${staticBinders.length}

## Instructions:
1. Extract these files to your public/static-binders/ directory
2. The files will be accessible at /binders/[slug] URLs
3. The index.json contains metadata for all binders
4. Add the sitemap entries below to your public/sitemap.xml

## Generated Files:
${staticBinders.map((b) => `- ${b.slug}.json -> /binders/${b.slug}`).join("\n")}

## Sitemap Entries (copy to public/sitemap.xml):
${sitemapEntries}

## SEO Benefits:
- Human-readable URLs (/binders/journey-together)
- Rich metadata and structured data
- No Firebase calls = faster loading
- Social media optimization
- Google-friendly sitemap entries
- Featured in public collections showcase
`;

      zip.file("README.md", readme);

      // Generate and download the ZIP
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `static-binders-${Date.now()}.zip`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success(
        `Successfully generated ${staticBinders.length} static binders! Download started.`
      );

      // Update the generated binders list in memory
      setGeneratedBinders((prev) => {
        const newBinders = indexData.binders.filter(
          (newBinder) => !prev.some((existing) => existing.id === newBinder.id)
        );
        return [...prev, ...newBinders];
      });

      // Clear selections
      setSelectedBinders(new Set());
      setBinderOptions({});
    } catch (error) {
      console.error("Error generating static binders:", error);
      toast.error(`Failed to generate static binders: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateStaticBinder = (binderData, options = {}) => {
    console.log("generateStaticBinder called with:", {
      binderData: binderData?.id,
      options,
    });

    if (!binderData) {
      throw new Error("Binder data is required");
    }

    if (!binderData.metadata) {
      throw new Error("Binder metadata is missing");
    }

    if (!binderData.metadata.name) {
      throw new Error("Binder name is missing");
    }

    const {
      featured = false,
      customSlug = null,
      seoTitle = null,
      seoDescription = null,
      tags = [],
      category = null,
    } = options;

    const slug = customSlug || generateSlug(binderData.metadata.name);

    // Calculate binder statistics
    const cardCount = Object.keys(binderData.cards || {}).length;
    const uniqueSets = new Set();
    const cardTypes = new Set();

    Object.values(binderData.cards || {}).forEach((card) => {
      if (card?.set?.name) uniqueSets.add(card.set.name);
      if (card?.types) card.types.forEach((type) => cardTypes.add(type));
    });

    const staticBinder = {
      // Basic binder data
      id: binderData.id,
      slug,
      metadata: {
        ...binderData.metadata,
        featured,
        category,
        tags: [...tags],
        statistics: {
          cardCount,
          uniqueSets: uniqueSets.size,
          cardTypes: Array.from(cardTypes),
          lastUpdated: new Date().toISOString(),
        },
      },

      // SEO metadata
      seo: {
        title:
          seoTitle || `${binderData.metadata.name} | Pokemon Card Collection`,
        description:
          seoDescription ||
          binderData.metadata.description ||
          `Explore this amazing Pokemon card collection featuring ${cardCount} cards from ${uniqueSets.size} different sets.`,
        keywords: [
          "pokemon cards",
          "card collection",
          "trading cards",
          ...Array.from(uniqueSets),
          ...tags,
        ].join(", "),
        ogImage: `/static-binders/${slug}/preview.jpg`, // You can add this later
        canonicalUrl: `/binders/${slug}`,
      },

      // Binder settings and layout
      settings: binderData.settings,

      // Card data
      cards: binderData.cards,

      // Generation metadata
      generatedAt: new Date().toISOString(),
      version: "1.0",
    };

    return staticBinder;
  };

  const handleDownloadData = async () => {
    if (selectedBinders.size === 0) {
      toast.error("Please select at least one binder");
      return;
    }

    try {
      const bindersData = [];

      for (const binderId of selectedBinders) {
        const binderData = await exportBinderData(binderId);
        bindersData.push(binderData);
      }

      const dataWithOptions = {
        binders: bindersData,
        options: binderOptions,
        generatedAt: new Date().toISOString(),
      };

      // Download as JSON
      const blob = new Blob([JSON.stringify(dataWithOptions, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `static-binders-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success("Binder data downloaded!");
    } catch (error) {
      console.error("Error downloading binder data:", error);
      toast.error(`Failed to download data: ${error.message}`);
    }
  };

  const isAlreadyGenerated = (binderId) => {
    return generatedBinders.some((gb) => gb.id === binderId);
  };

  return (
    <div className="space-y-6">
      <div className="bg-card-background rounded-lg border border-border p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <GlobeAltIcon className="h-5 w-5 mr-2" />
              Static Binder Generator
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Generate SEO-friendly static pages for your best binders
            </p>
          </div>

          <div className="flex space-x-2">
            <Button
              onClick={handleDownloadData}
              disabled={selectedBinders.size === 0}
              variant="outline"
              size="sm"
            >
              <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
              Download Data
            </Button>

            <Button
              onClick={handleGenerateStatic}
              disabled={selectedBinders.size === 0 || isGenerating}
              size="sm"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <GlobeAltIcon className="h-4 w-4 mr-2" />
                  Generate Static Pages
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-600">
              {selectedBinders.size}
            </div>
            <div className="text-sm text-blue-700">Selected</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-600">
              {generatedBinders.length}
            </div>
            <div className="text-sm text-green-700">Generated</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-purple-600">
              {binders.length}
            </div>
            <div className="text-sm text-purple-700">Total Binders</div>
          </div>
        </div>

        {/* Binder Selection */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">
            Select Binders for Static Generation
          </h4>

          <div className="space-y-3">
            {binders.map((binder) => {
              const isSelected = selectedBinders.has(binder.id);
              const isGenerated = isAlreadyGenerated(binder.id);
              const cardCount = Object.keys(binder.cards || {}).length;

              return (
                <div
                  key={binder.id}
                  className={`border rounded-lg p-4 transition-all ${
                    isSelected
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleBinderSelection(binder.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />

                      <div>
                        <div className="font-medium text-gray-900">
                          {binder.metadata.name}
                        </div>
                        <div className="text-sm text-gray-600">
                          {cardCount} cards •{" "}
                          {binder.settings?.gridSize || "3x3"} grid
                        </div>
                        {binder.metadata.description && (
                          <div className="text-sm text-gray-500 mt-1">
                            {binder.metadata.description}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {isGenerated && (
                        <div className="flex items-center text-green-600 text-sm">
                          <CheckCircleIcon className="h-4 w-4 mr-1" />
                          Generated
                        </div>
                      )}

                      <Button
                        onClick={() =>
                          window.open(`/binder/${binder.id}`, "_blank")
                        }
                        variant="outline"
                        size="sm"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Options for selected binders */}
                  {isSelected && binderOptions[binder.id] && (
                    <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-text-secondary mb-1">
                            URL Slug
                          </label>
                          <input
                            type="text"
                            value={binderOptions[binder.id].customSlug}
                            onChange={(e) =>
                              updateBinderOptions(
                                binder.id,
                                "customSlug",
                                e.target.value
                              )
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="url-friendly-name"
                          />
                          <div className="text-xs text-gray-500 mt-1">
                            Will be: /binders/
                            {binderOptions[binder.id].customSlug}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-text-secondary mb-1">
                            Category
                          </label>
                          <select
                            value={binderOptions[binder.id].category}
                            onChange={(e) =>
                              updateBinderOptions(
                                binder.id,
                                "category",
                                e.target.value
                              )
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Select category</option>
                            <option value="vintage">Vintage</option>
                            <option value="modern">Modern</option>
                            <option value="competitive">Competitive</option>
                            <option value="collection">Collection</option>
                            <option value="specialty">Specialty</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          SEO Title
                        </label>
                        <input
                          type="text"
                          value={binderOptions[binder.id].seoTitle}
                          onChange={(e) =>
                            updateBinderOptions(
                              binder.id,
                              "seoTitle",
                              e.target.value
                            )
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="SEO-optimized title (50-60 characters)"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          SEO Description
                        </label>
                        <textarea
                          value={binderOptions[binder.id].seoDescription}
                          onChange={(e) =>
                            updateBinderOptions(
                              binder.id,
                              "seoDescription",
                              e.target.value
                            )
                          }
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="SEO-optimized description (150-160 characters)"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">
                            Tags (comma-separated)
                          </label>
                        <input
                          type="text"
                          value={binderOptions[binder.id].tags.join(", ")}
                          onChange={(e) =>
                            updateBinderOptions(
                              binder.id,
                              "tags",
                              e.target.value
                                .split(",")
                                .map((tag) => tag.trim())
                                .filter(Boolean)
                            )
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="pokemon, cards, base set, vintage"
                        />
                      </div>

                      <div>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={binderOptions[binder.id].featured}
                            onChange={(e) =>
                              updateBinderOptions(
                                binder.id,
                                "featured",
                                e.target.checked
                              )
                            }
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700">
                            Featured binder (appears prominently in listings)
                          </span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Generated Binders List */}
      {generatedBinders.length > 0 && (
        <div className="bg-card-background rounded-lg border border-border p-6">
          <h4 className="font-medium text-gray-900 mb-4">
            Generated Static Binders
          </h4>

          <div className="space-y-2">
            {generatedBinders.map((binder) => (
              <div
                key={binder.slug}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <div className="font-medium text-gray-900">{binder.name}</div>
                  <div className="text-sm text-gray-600">
                    {binder.statistics.cardCount} cards • Updated{" "}
                    {new Date(binder.lastUpdated).toLocaleDateString()}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    onClick={() =>
                      window.open(`/binders/${binder.slug}`, "_blank")
                    }
                    variant="outline"
                    size="sm"
                  >
                    <EyeIcon className="h-4 w-4 mr-2" />
                    View
                  </Button>

                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `${window.location.origin}/binders/${binder.slug}`
                      );
                      toast.success("Link copied!");
                    }}
                    variant="outline"
                    size="sm"
                  >
                    <LinkIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default StaticBinderGenerator;

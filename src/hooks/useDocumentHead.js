import { useEffect } from "react";

export const useDocumentHead = ({
  title,
  description,
  keywords,
  ogTitle,
  ogDescription,
  ogImage,
  ogUrl,
  canonicalUrl,
  structuredData,
}) => {
  useEffect(() => {
    // Store original values to restore on cleanup
    const originalTitle = document.title;
    const originalMeta = [];

    // Helper function to set or update meta tag
    const setMetaTag = (name, content, property = false) => {
      if (!content) return;

      const attribute = property ? "property" : "name";
      const selector = `meta[${attribute}="${name}"]`;
      let meta = document.querySelector(selector);

      if (meta) {
        originalMeta.push({
          element: meta,
          originalContent: meta.getAttribute("content"),
        });
        meta.setAttribute("content", content);
      } else {
        meta = document.createElement("meta");
        meta.setAttribute(attribute, name);
        meta.setAttribute("content", content);
        document.head.appendChild(meta);
        originalMeta.push({ element: meta, originalContent: null });
      }
    };

    // Helper function to set or update link tag
    const setLinkTag = (rel, href) => {
      if (!href) return;

      let link = document.querySelector(`link[rel="${rel}"]`);

      if (link) {
        originalMeta.push({
          element: link,
          originalContent: link.getAttribute("href"),
        });
        link.setAttribute("href", href);
      } else {
        link = document.createElement("link");
        link.setAttribute("rel", rel);
        link.setAttribute("href", href);
        document.head.appendChild(link);
        originalMeta.push({ element: link, originalContent: null });
      }
    };

    // Set title
    if (title) {
      document.title = title;
    }

    // Set meta tags
    setMetaTag("description", description);
    setMetaTag("keywords", keywords);

    // Open Graph tags
    setMetaTag("og:title", ogTitle || title, true);
    setMetaTag("og:description", ogDescription || description, true);
    setMetaTag("og:image", ogImage, true);
    setMetaTag("og:url", ogUrl, true);
    setMetaTag("og:type", "website", true);

    // Twitter Card tags
    setMetaTag("twitter:card", "summary_large_image");
    setMetaTag("twitter:title", ogTitle || title);
    setMetaTag("twitter:description", ogDescription || description);
    setMetaTag("twitter:image", ogImage);

    // Canonical URL
    setLinkTag("canonical", canonicalUrl);

    // Structured Data
    let structuredDataScript = null;
    if (structuredData) {
      structuredDataScript = document.createElement("script");
      structuredDataScript.type = "application/ld+json";
      structuredDataScript.textContent = JSON.stringify(structuredData);
      document.head.appendChild(structuredDataScript);
    }

    // Cleanup function
    return () => {
      // Restore original title
      document.title = originalTitle;

      // Restore or remove meta tags
      originalMeta.forEach(({ element, originalContent }) => {
        if (originalContent !== null) {
          element.setAttribute("content", originalContent);
        } else {
          element.remove();
        }
      });

      // Remove structured data script
      if (structuredDataScript) {
        structuredDataScript.remove();
      }
    };
  }, [
    title,
    description,
    keywords,
    ogTitle,
    ogDescription,
    ogImage,
    ogUrl,
    canonicalUrl,
    structuredData,
  ]);
};

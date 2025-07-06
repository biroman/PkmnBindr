import React from "react";

// Best-practice CTA component encouraging users to support the project
// Uses accessible attributes, Tailwind styling and follows project guidelines
const SupportUsCTA = () => {
  return (
    <a
      href="https://buymeacoffee.com/biroman"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Support the project by buying me a coffee"
      tabIndex={0}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold bg-yellow-400 text-black shadow-md hover:bg-yellow-300 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 focus-visible:ring-offset-2"
    >
      <span>💖</span>
      <span>Click to support</span>
    </a>
  );
};

export default SupportUsCTA;

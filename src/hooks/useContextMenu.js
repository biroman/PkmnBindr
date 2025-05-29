import { useState, useCallback, useEffect } from "react";

const useContextMenu = () => {
  const [contextMenu, setContextMenu] = useState({
    isVisible: false,
    position: { x: 0, y: 0 },
  });

  // Handle right-click context menu
  const handleContextMenu = useCallback((event) => {
    event.preventDefault(); // Prevent default browser context menu

    // Calculate position to ensure menu stays within viewport
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const menuWidth = 200; // Approximate menu width
    const menuHeight = 150; // Approximate menu height

    let x = event.clientX;
    let y = event.clientY;

    // Adjust if menu would go off-screen horizontally
    if (x + menuWidth > viewportWidth) {
      x = viewportWidth - menuWidth - 10;
    }

    // Adjust if menu would go off-screen vertically
    if (y + menuHeight > viewportHeight) {
      y = viewportHeight - menuHeight - 10;
    }

    // Ensure minimum distance from edges
    x = Math.max(10, x);
    y = Math.max(10, y);

    setContextMenu({
      isVisible: true,
      position: { x, y },
    });
  }, []);

  // Close context menu
  const closeContextMenu = useCallback(() => {
    setContextMenu((prev) => ({
      ...prev,
      isVisible: false,
    }));
  }, []);

  // Disable default context menu on the entire document when hook is active
  useEffect(() => {
    const preventDefaultContextMenu = (e) => {
      // Only prevent default on elements that should have our custom menu
      const target = e.target;
      if (target.closest("[data-custom-context-menu]")) {
        e.preventDefault();
      }
    };

    document.addEventListener("contextmenu", preventDefaultContextMenu);

    return () => {
      document.removeEventListener("contextmenu", preventDefaultContextMenu);
    };
  }, []);

  return {
    contextMenu,
    handleContextMenu,
    closeContextMenu,
  };
};

export default useContextMenu;

import { useTheme } from "../../theme/ThemeContent";
import { AppHeader, AppSidebar, AppFooter } from "../AppLayout";

/**
 * AppShell - Handles the overall layout structure
 * Provides consistent layout without business logic
 */
const AppShell = ({
  children,
  showSidebar,
  onToggleSidebar,
  headerProps,
  sidebarProps,
}) => {
  const { theme } = useTheme();

  return (
    <div
      className={`min-h-screen ${theme.colors.background.main} flex flex-col`}
    >
      <AppHeader
        showSidebar={showSidebar}
        onToggleSidebar={onToggleSidebar}
        {...headerProps}
      />

      <div className="flex-1 flex overflow-hidden">
        <AppSidebar
          showSidebar={showSidebar}
          onToggleSidebar={() => onToggleSidebar(false)}
          {...sidebarProps}
        />

        <main
          className={`flex-1 min-w-0 relative ${showSidebar ? "md:ml-0" : ""}`}
        >
          {children}
        </main>
      </div>

      <AppFooter />
    </div>
  );
};

export default AppShell;

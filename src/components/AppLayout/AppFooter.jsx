import { useTheme } from "../../theme/ThemeContent";

const AppFooter = () => {
  const { theme } = useTheme();

  return (
    <footer
      className={`${theme.colors.background.sidebar} border-t ${theme.colors.border.accent} px-6 py-4`}
    >
      <p className={`text-center ${theme.colors.text.secondary} text-xs`}>
        PkmnBindr is not affiliated with, sponsored or endorsed by Pokemon or
        The Pokemon Company International Inc.
      </p>
    </footer>
  );
};

export default AppFooter;

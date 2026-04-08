import React from "react";
import {
  COLORS,
  SHADOWS,
  buildRuntimeShadows,
  getActivePalette,
  type ColorPalette,
  type RuntimeColors,
  type RuntimeShadows,
} from "../../runtime";

interface PaletteThemeValue {
  colors: RuntimeColors;
  shadows: RuntimeShadows;
}

const defaultTheme: PaletteThemeValue = {
  colors: COLORS,
  shadows: SHADOWS,
};

const PaletteThemeContext = React.createContext<PaletteThemeValue>(defaultTheme);

export const PaletteThemeProvider = ({
  paletteKey,
  customPalette,
  children,
}: {
  paletteKey?: string;
  customPalette?: ColorPalette;
  children: React.ReactNode;
}) => {
  const colors = getActivePalette(paletteKey, customPalette);
  const shadows = buildRuntimeShadows(colors);

  return (
    <PaletteThemeContext.Provider
      value={{
        colors,
        shadows,
      }}
    >
      {children}
    </PaletteThemeContext.Provider>
  );
};

export const usePaletteTheme = () => React.useContext(PaletteThemeContext);
export const usePaletteColors = () => usePaletteTheme().colors;
export const usePaletteShadows = () => usePaletteTheme().shadows;

import { createTheme, type MantineColorsTuple } from "@mantine/core";

/** アプリのテーマカラー(#0f5b8a)を基準にした配色 */
const brand: MantineColorsTuple = ["#e7f4fb", "#d0e6f2", "#a2cbe3", "#71afd5", "#4a98c9", "#3189c1", "#2282be", "#126fa8", "#0b6196", "#0f5b8a"];

/**
 * Mantineのテーマ。スマホでも情報量を確保するため、余白と文字サイズは控えめにしている
 * （個々の部品では size="xs"/"sm" を指定する）。
 */
export const theme = createTheme({
    colors: { brand },
    primaryColor: "brand",
    primaryShade: 9,
    defaultRadius: "sm",
    fontFamily: "system-ui, Avenir, Helvetica, Arial, sans-serif",
    spacing: { xs: "0.375rem", sm: "0.5rem", md: "0.75rem", lg: "1rem", xl: "1.5rem" },
});

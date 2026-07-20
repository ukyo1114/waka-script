import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";

const navy = {
  950: { value: "#070f1f" },
  900: { value: "#0c1830" },
  800: { value: "#122445" },
  700: { value: "#1a3058" },
  600: { value: "#243d6b" },
};

const customConfig = defineConfig({
  globalCss: {
    html: {
      bg: "bg",
      color: "fg",
      colorScheme: "dark",
    },
    body: {
      bg: "bg",
      color: "fg",
    },
    "#root": {
      minH: "100dvh",
      bg: "bg",
      color: "fg",
    },
  },
  theme: {
    tokens: {
      colors: {
        navy,
      },
    },
    semanticTokens: {
      colors: {
        bg: {
          DEFAULT: { value: "{colors.navy.900}" },
          subtle: { value: "{colors.navy.950}" },
          muted: { value: "{colors.navy.800}" },
          emphasized: { value: "{colors.navy.700}" },
          panel: { value: "{colors.navy.800}" },
        },
        fg: {
          DEFAULT: { value: "#ffffff" },
          muted: { value: "#cbd5e1" },
          subtle: { value: "#94a3b8" },
        },
        border: {
          DEFAULT: { value: "{colors.navy.600}" },
          muted: { value: "{colors.navy.700}" },
          emphasized: { value: "{colors.navy.600}" },
        },
      },
    },
  },
});

export const system = createSystem(defaultConfig, customConfig);

// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

// Project site served from https://prajwal-svm.github.io/OpenLeaf/.
export default defineConfig({
  site: "https://prajwal-svm.github.io",
  base: "/OpenLeaf",
  integrations: [
    starlight({
      title: "OpenLeaf",
      description:
        "Free, local-first LaTeX and resume editor for macOS, Windows, and Linux. An offline Overleaf alternative with Git, GitHub sync, SyncTeX, and bring-your-own-key AI.",
      logo: { src: "./src/assets/leaf.svg", alt: "OpenLeaf" },
      favicon: "/favicon.png",
      customCss: ["./src/styles/theme.css"],
      social: [
        { icon: "github", label: "GitHub", href: "https://github.com/prajwal-svm/OpenLeaf" },
      ],
      editLink: {
        baseUrl: "https://github.com/prajwal-svm/OpenLeaf/edit/main/docs/",
      },
      sidebar: [
        {
          label: "Start here",
          items: [
            { label: "Getting started", slug: "getting-started" },
            { label: "Install", slug: "install" },
            { label: "Features", slug: "features" },
          ],
        },
        {
          label: "Guides",
          items: [
            { label: "AI assistant", slug: "ai-assistant" },
            { label: "GitHub sync", slug: "github-sync" },
            { label: "Keyboard shortcuts", slug: "keyboard-shortcuts" },
            { label: "Auto-updates", slug: "updates" },
            { label: "FAQ", slug: "faq" },
          ],
        },
        {
          label: "Contributing",
          items: [
            { label: "Development", slug: "development" },
            { label: "Releasing", slug: "releasing" },
          ],
        },
      ],
    }),
  ],
});

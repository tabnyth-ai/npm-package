import preact from "@preact/preset-vite";

export default {
  plugins: [preact()],
  root: "src/ui",
  build: {
    outDir: "../../dist/ui",
    emptyOutDir: true
  }
};

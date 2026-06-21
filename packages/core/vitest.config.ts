import preact from "@preact/preset-vite";

export default {
  plugins: [preact()],
  test: {
    environment: "jsdom",
    globals: true
  }
};

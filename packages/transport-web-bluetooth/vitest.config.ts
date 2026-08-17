import { defineProject } from "vitest/config";

export default defineProject({
  test: {
    name: "@meshtastic/transport-web-bluetooth",
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});

import next from "eslint-config-next";

const config = [
  ...next,
  { ignores: [".next/**", ".next-e2e/**", "node_modules/**", "playwright-report/**", "test-results/**", "drizzle/**"] },
];

export default config;

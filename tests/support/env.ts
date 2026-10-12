import { config } from "dotenv";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

// Tests always run against the separate test database with the mock adapter.
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.APP_ENV = "development";
process.env.AUTH_PROVIDER = "mock";
process.env.MOCK_AUTH_ENABLED = "true";
process.env.APP_URL_ALLOWED_HOSTS = "*.kinra.example";
process.env.APP_URL_ALLOW_HTTP = "false";
process.env.SESSION_SECRET ??= "test-secret-test-secret-test-secret-123";

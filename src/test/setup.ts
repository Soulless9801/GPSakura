import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Testing Library only registers its own cleanup when `afterEach` is a global; this project
// imports test functions explicitly, so unmount rendered trees here. A no-op in node tests.
afterEach(() => {
    cleanup();
});

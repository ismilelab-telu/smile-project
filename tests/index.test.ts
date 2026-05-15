import { expect, test } from "bun:test";

import { smileMessage } from "../src";

test("smileMessage returns the Bun greeting", () => {
  expect(smileMessage()).toBe("Smile Project is running on Bun.");
});

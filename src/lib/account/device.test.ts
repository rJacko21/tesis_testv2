import { describe, expect, it } from "vitest";

import { describeDevice } from "./device";

describe("describeDevice", () => {
  it.each([
    [
      "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36",
      "Chrome",
      "Android",
    ],
    [
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
      "Safari",
      "iOS",
    ],
    [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0",
      "Edge",
      "Windows",
    ],
    [
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 14.6; rv:144.0) Gecko/20100101 Firefox/144.0",
      "Firefox",
      "macOS",
    ],
    [
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/141.0 Safari/537.36",
      "Chrome",
      "Linux",
    ],
  ])("reconoce %s", (ua, browser, os) => {
    expect(describeDevice(ua)).toEqual({ browser, os });
  });

  it("devuelve null en lo que no reconoce", () => {
    expect(describeDevice("curl/8.0")).toEqual({ browser: null, os: null });
    expect(describeDevice(null)).toEqual({ browser: null, os: null });
  });
});

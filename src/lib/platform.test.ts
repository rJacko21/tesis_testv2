import { describe, expect, it } from "vitest";

import { detectPlatform } from "./platform";

const UA = {
  windowsChrome:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36",
  macSafari:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15",
  linuxFirefox: "Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0",
  android:
    "Mozilla/5.0 (Linux; Android 15; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Mobile Safari/537.36",
  iphone:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
};

describe("detectPlatform", () => {
  it("prefiere Sec-CH-UA-Platform cuando llega", () => {
    expect(detectPlatform(UA.linuxFirefox, '"Windows"')).toBe("windows");
    expect(detectPlatform(null, '"macOS"')).toBe("mac");
    expect(detectPlatform(null, '"Chrome OS"')).toBe("linux");
  });

  it.each([
    ["windowsChrome", "windows"],
    ["macSafari", "mac"],
    ["linuxFirefox", "linux"],
    ["android", "android"],
    ["iphone", "ios"],
  ] as const)("reconoce %s por el User-Agent", (key, expected) => {
    expect(detectPlatform(UA[key])).toBe(expected);
  });

  it("sin datos devuelve unknown", () => {
    expect(detectPlatform(null)).toBe("unknown");
    expect(detectPlatform("curl/8.0", '"Unknown"')).toBe("unknown");
  });
});

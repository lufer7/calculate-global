import { describe, expect, it } from "vitest";
import { isPublicIp } from "./ip";

describe("isPublicIp", () => {
  it.each(["8.8.8.8", "1.1.1.1", "185.10.20.30", "2606:4700::1111", "2a00:1450:4001::200e", "::ffff:8.8.8.8"])("%s public", (ip) =>
    expect(isPublicIp(ip)).toBe(true),
  );
  it.each([
    "127.0.0.1",
    "10.1.2.3",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.1.1",
    "169.254.169.254",
    "100.64.0.1",
    "0.0.0.0",
    "224.0.0.1",
    "255.255.255.255",
    "198.18.0.1",
    "::1",
    "::",
    "fc00::1",
    "fd12::1",
    "fe80::1",
    "ff02::1",
    "2001:db8::1",
    "::ffff:127.0.0.1",
    "[::1]",
    "999.1.1.1",
    "1.2.3",
    "a.b.c.d",
    "localhost",
  ])("%s engelli", (ip) => expect(isPublicIp(ip)).toBe(false));
  it("sınırlar", () => {
    expect(isPublicIp("172.15.255.255")).toBe(true);
    expect(isPublicIp("172.32.0.0")).toBe(true);
    expect(isPublicIp(":1:2")).toBe(true);
  });
});

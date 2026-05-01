import { buildDoctorSearchUrl } from "../src/services/doctors";

describe("doctor search URL builder", () => {
  it("builds URL with lat/lng", () => {
    const url = buildDoctorSearchUrl({ lat: 12.9716, lng: 77.5946, apiKey: "KEY" });
    expect(url).toContain("location=12.9716%2C77.5946");
    expect(url).toContain("keyword=dermatologist");
    expect(url).toContain("key=KEY");
  });

  it("builds URL with city text search", () => {
    const url = buildDoctorSearchUrl({ city: "Bangalore", apiKey: "KEY" });
    expect(url).toContain("dermatologist");
    expect(url).toContain("Bangalore");
  });
});

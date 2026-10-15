import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import WeatherWidget from "../components/WeatherWidget";
import * as weatherService from "../services/weatherService";

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    user: { location: "Nashik" },
  }),
}));

const mockWeatherData = {
  location: {
    name: "Nashik",
    country: "India",
    admin1: "Maharashtra",
    latitude: 19.9975,
    longitude: 73.7898,
    timezone: "Asia/Kolkata",
  },
  current: {
    time: "2026-10-15T08:00",
    temperature: 27.2,
    humidity: 58,
    precipitation: 0.0,
    windSpeed: 9.5,
    weatherCode: 0,
    condition: "Clear sky",
  },
  daily: [
    {
      date: "2026-10-15",
      tempMax: 32.0,
      tempMin: 19.5,
      precipitationSum: 0.0,
      precipitationProbability: 10,
      windSpeedMax: 12.0,
      weatherCode: 0,
      condition: "Clear sky",
    },
    {
      date: "2026-10-16",
      tempMax: 29.0,
      tempMin: 18.0,
      precipitationSum: 4.5,
      precipitationProbability: 75,
      windSpeedMax: 15.0,
      weatherCode: 61,
      condition: "Slight rain",
    },
  ],
  hourly: [],
  provider: "Open-Meteo",
};

describe("WeatherWidget Component", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders weather data with current conditions and forecast outlook", async () => {
    vi.spyOn(weatherService, "getWeather").mockResolvedValue({
      data: { success: true, data: mockWeatherData },
    });

    render(<WeatherWidget />);

    expect(screen.getByTestId("weather-widget")).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText(/Nashik/)).toBeDefined();
    });

    expect(screen.getByText("27°C")).toBeDefined();
    expect(screen.getAllByText("Clear sky").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("58%")).toBeDefined();
    expect(screen.getByText("7-Day Farming Outlook")).toBeDefined();
    expect(screen.getByText("Today")).toBeDefined();
    expect(screen.getByText("Tomorrow")).toBeDefined();
  });

  it("displays error banner and retry option when API request fails", async () => {
    vi.spyOn(weatherService, "getWeather").mockRejectedValue({
      response: { data: { message: "Open-Meteo rate limit exceeded" } },
    });

    render(<WeatherWidget />);

    await waitFor(() => {
      expect(screen.getByTestId("weather-error")).toBeDefined();
    });

    expect(screen.getByText("Open-Meteo rate limit exceeded")).toBeDefined();
    expect(screen.getByText("Retry")).toBeDefined();
  });

  it("allows switching to location edit form and entering new location", async () => {
    vi.spyOn(weatherService, "getWeather").mockResolvedValue({
      data: { success: true, data: mockWeatherData },
    });

    render(<WeatherWidget />);

    await waitFor(() => {
      expect(screen.getByText(/Nashik/)).toBeDefined();
    });

    const editButton = screen.getByTitle("Change farm location");
    fireEvent.click(editButton);

    const input = screen.getByPlaceholderText("Enter city or lat,lon...");
    expect(input).toBeDefined();

    fireEvent.change(input, { target: { value: "Pune" } });
    expect(input.value).toBe("Pune");
  });
});

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import WeatherAlertsSection from "../components/WeatherAlertsSection";
import * as weatherService from "../services/weatherService";

const mockAlerts = [
  {
    _id: "alert_1",
    alertKey: "act_1_irrigation_2026-10-16",
    category: "Irrigation",
    cropName: "Wheat",
    activityName: "Secondary Irrigation",
    severity: "warning",
    title: "Rain Expected — Review Irrigation",
    message: "Rainfall of 7.5 mm is forecast on 2026-10-16.",
    recommendation: "Consider pausing or reducing irrigation to avoid waterlogging.",
    forecastDate: "2026-10-16",
    weatherValues: {
      precipitationSum: 7.5,
      precipitationProbability: 80,
      windSpeedMax: 10,
      tempMax: 30,
      tempMin: 20,
    },
    isRead: false,
    isDismissed: false,
  },
];

describe("WeatherAlertsSection Component", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders all clear state when no active alerts exist", () => {
    render(<WeatherAlertsSection alerts={[]} />);

    expect(screen.getByText(/All clear!/)).toBeDefined();
    expect(
      screen.getByText(/No adverse weather risks detected/)
    ).toBeDefined();
  });

  it("renders alert details, category pill, advisory, and weather metrics", () => {
    render(<WeatherAlertsSection alerts={mockAlerts} />);

    expect(screen.getByText("Weather-Based Farming Alerts")).toBeDefined();
    expect(screen.getByText("1 Active")).toBeDefined();
    expect(screen.getByText("Rain Expected — Review Irrigation")).toBeDefined();
    expect(screen.getByText(/Rainfall of 7.5 mm is forecast/)).toBeDefined();
    expect(
      screen.getByText(/Consider pausing or reducing irrigation/)
    ).toBeDefined();
    expect(screen.getByText(/7.5 mm rain/)).toBeDefined();
  });

  it("allows dismissing an active alert", async () => {
    const dismissSpy = vi
      .spyOn(weatherService, "dismissAlert")
      .mockResolvedValue({ data: { success: true } });

    render(<WeatherAlertsSection alerts={mockAlerts} />);

    const dismissBtn = screen.getByTitle("Dismiss alert");
    expect(dismissBtn).toBeDefined();

    fireEvent.click(dismissBtn);

    await waitFor(() => {
      expect(dismissSpy).toHaveBeenCalledWith("alert_1");
    });
  });

  it("allows marking an alert as read", async () => {
    const readSpy = vi
      .spyOn(weatherService, "markAlertRead")
      .mockResolvedValue({ data: { success: true } });

    render(<WeatherAlertsSection alerts={mockAlerts} />);

    const readBtn = screen.getByTitle("Mark as Read");
    expect(readBtn).toBeDefined();

    fireEvent.click(readBtn);

    await waitFor(() => {
      expect(readSpy).toHaveBeenCalledWith("alert_1");
    });
  });
});

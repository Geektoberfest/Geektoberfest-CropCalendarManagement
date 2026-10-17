import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import Register from "../pages/Register";
import * as authService from "../services/authService";

function renderRegister() {
  return render(
    <BrowserRouter>
      <Register />
    </BrowserRouter>
  );
}

describe("Register Component", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders all registration fields and submit button", () => {
    renderRegister();

    expect(screen.getByPlaceholderText("Farmer Name")).toBeDefined();
    expect(screen.getByPlaceholderText("farmer@example.com")).toBeDefined();
    expect(screen.getByPlaceholderText("Phone number (optional)")).toBeDefined();
    expect(screen.getByPlaceholderText("Location or district")).toBeDefined();
    expect(screen.getByPlaceholderText("At least 6 characters")).toBeDefined();
    expect(screen.getByPlaceholderText("Re-enter password")).toBeDefined();
    expect(screen.getByRole("button", { name: "Create account" })).toBeDefined();
  });

  it("shows error when passwords do not match", async () => {
    renderRegister();

    fireEvent.change(screen.getByPlaceholderText("Farmer Name"), {
      target: { value: "Farmer John" },
    });
    fireEvent.change(screen.getByPlaceholderText("farmer@example.com"), {
      target: { value: "john@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("At least 6 characters"), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByPlaceholderText("Re-enter password"), {
      target: { value: "mismatch456" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => {
      expect(screen.getByText("Passwords do not match")).toBeDefined();
    });
  });

  it("shows error when email format is invalid", async () => {
    renderRegister();

    fireEvent.change(screen.getByPlaceholderText("Farmer Name"), {
      target: { value: "Farmer John" },
    });
    fireEvent.change(screen.getByPlaceholderText("farmer@example.com"), {
      target: { value: "not-an-email" },
    });
    fireEvent.change(screen.getByPlaceholderText("At least 6 characters"), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByPlaceholderText("Re-enter password"), {
      target: { value: "password123" },
    });

    fireEvent.submit(screen.getByRole("button", { name: "Create account" }).closest("form"));

    await waitFor(() => {
      expect(screen.getByText("Please provide a valid email address")).toBeDefined();
    });
  });

  it("handles loading state and disables submit during registration", async () => {
    let resolveRegister;
    vi.spyOn(authService, "register").mockImplementation(
      () =>
        new Promise((res) => {
          resolveRegister = res;
        })
    );

    renderRegister();

    fireEvent.change(screen.getByPlaceholderText("Farmer Name"), {
      target: { value: "Farmer John" },
    });
    fireEvent.change(screen.getByPlaceholderText("farmer@example.com"), {
      target: { value: "john@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("At least 6 characters"), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByPlaceholderText("Re-enter password"), {
      target: { value: "password123" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => {
      const button = screen.getByRole("button");
      expect(button.textContent).toBe("Creating account...");
      expect(button.hasAttribute("disabled")).toBe(true);
    });

    resolveRegister({ data: { success: true } });

    await waitFor(() => {
      expect(
        screen.getByText("Account created successfully! Redirecting to login...")
      ).toBeDefined();
    });
  });

  it("displays backend error message on failure", async () => {
    vi.spyOn(authService, "register").mockRejectedValue({
      response: {
        data: {
          success: false,
          message: "Email already registered",
        },
      },
    });

    renderRegister();

    fireEvent.change(screen.getByPlaceholderText("Farmer Name"), {
      target: { value: "Farmer John" },
    });
    fireEvent.change(screen.getByPlaceholderText("farmer@example.com"), {
      target: { value: "john@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("At least 6 characters"), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByPlaceholderText("Re-enter password"), {
      target: { value: "password123" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => {
      expect(screen.getByText("Email already registered")).toBeDefined();
    });
  });

  it("displays actionable error message on network failure", async () => {
    vi.spyOn(authService, "register").mockRejectedValue({
      code: "ERR_NETWORK",
    });

    renderRegister();

    fireEvent.change(screen.getByPlaceholderText("Farmer Name"), {
      target: { value: "Farmer John" },
    });
    fireEvent.change(screen.getByPlaceholderText("farmer@example.com"), {
      target: { value: "john@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("At least 6 characters"), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByPlaceholderText("Re-enter password"), {
      target: { value: "password123" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => {
      expect(
        screen.getByText(
          "Unable to connect to the server. Please check your network connection or try again later."
        )
      ).toBeDefined();
    });
  });
});

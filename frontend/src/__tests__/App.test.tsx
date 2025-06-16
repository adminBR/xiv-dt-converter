// src/__tests__/App.test.tsx
import { render, screen } from "@testing-library/react";
import App from "../App";
import "@testing-library/jest-dom";

test("renders without crashing", () => {
  render(<App />);
  expect(screen.getByText(/XIV - DT updater/i)).toBeInTheDocument();
});

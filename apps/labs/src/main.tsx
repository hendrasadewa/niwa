import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";
import Home from "./routes/home";
import ExampleDemo from "./routes/example-demo";
import SqliteDemo from "./routes/sqlite-demo";
import BookScannerDemo from "./routes/book-scanner";
import "./index.css";

const router = createBrowserRouter([
  { path: "/", element: <Home /> },
  { path: "/demos/example", element: <ExampleDemo /> },
  { path: "/demos/sqlite", element: <SqliteDemo /> },
  { path: "/demos/book-scanner", element: <BookScannerDemo /> },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, Navigate, RouterProvider } from "react-router";
import { RequireAdmin, RequireAuth } from "./components/portal-layout";
import { AuthProvider } from "./context/auth-context";
import IndexRoute from "./routes/index";
import LoginRoute from "./routes/login";
import RegisterRoute from "./routes/register";
import ConsentRoute from "./routes/consent";
import AccountProfileRoute from "./routes/account/profile";
import AccountSessionsRoute from "./routes/account/sessions";
import AccountAppsRoute from "./routes/account/apps";
import AdminAppsRoute from "./routes/admin/apps";
import AdminRolesRoute from "./routes/admin/roles";
import AdminUsersRoute from "./routes/admin/users";
import "./index.css";

const router = createBrowserRouter([
  { path: "/", element: <IndexRoute /> },
  { path: "/login", element: <LoginRoute /> },
  { path: "/register", element: <RegisterRoute /> },
  { path: "/consent", element: <ConsentRoute /> },
  {
    element: <RequireAuth />,
    children: [
      { path: "/account", element: <AccountProfileRoute /> },
      { path: "/account/sessions", element: <AccountSessionsRoute /> },
      { path: "/account/apps", element: <AccountAppsRoute /> },
      {
        path: "/admin",
        element: <RequireAdmin />,
        children: [
          { index: true, element: <Navigate to="/admin/apps" replace /> },
          { path: "apps", element: <AdminAppsRoute /> },
          { path: "roles", element: <AdminRolesRoute /> },
          { path: "users", element: <AdminUsersRoute /> },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>
);

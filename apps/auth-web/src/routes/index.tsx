import { Navigate } from "react-router";
import { FullPageLoader } from "@niwa/ui/components";
import { useAuth } from "../context/auth-context";

export default function IndexRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <FullPageLoader label="Checking session..." />;
  }

  return <Navigate to={user ? "/account" : "/login"} replace />;
}

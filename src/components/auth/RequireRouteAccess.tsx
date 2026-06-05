import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { canAccessAppRoute } from "@/lib/roles";

export default function RequireRouteAccess({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading, isLoggedIn } = useAuth();

  useEffect(() => {
    if (!loading && isLoggedIn && user && !canAccessAppRoute(user.role, location.pathname)) {
      navigate("/dashboard", { replace: true });
    }
  }, [loading, isLoggedIn, user, location.pathname, navigate]);

  if (loading || !isLoggedIn) return null;
  if (user && !canAccessAppRoute(user.role, location.pathname)) return null;

  return <>{children}</>;
}

import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ResearchDesigner } from "./components/ResearchDesigner";
import { LandingPage } from "./components/LandingPage";

function AppInner() {
  const { token } = useAuth();
  if (!token) return <LandingPage />;
  return <ResearchDesigner />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}

import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ResearchDesigner } from "./components/ResearchDesigner";
import { LoginPage } from "./components/LoginPage";

function AppInner() {
  const { token } = useAuth();
  if (!token) return <LoginPage />;
  return <ResearchDesigner />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}

import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import BrowsePage from "./legacy/pages/BrowsePage";
import MatchDashboard from "./legacy/pages/MatchDashboard";
import PicksPage from "./legacy/pages/PicksPage";
import AnalyzePage from "./legacy/pages/AnalyzePage";
import Predictions11Page from "./legacy/pages/Predictions11Page";
import SoccerBuddy12Page from "./legacy/pages/SoccerBuddy12Page";
import { ZCodeProvider } from "./store/zcodeStore"; // 👈 ajoute cette ligne

function App() {
  return (
    <ZCodeProvider> {/* 👈 on enveloppe tout ici */}
      <Router>
        <div className="min-h-screen web3-bg web3-hd text-white">
          <Navbar />
          <Routes>
            <Route path="/" element={<Navigate to="/browse" replace />} />
            <Route path="/browse" element={<BrowsePage />} />
            <Route path="/match/:id" element={<MatchDashboard />} />
            <Route path="/picks" element={<PicksPage />} />
            <Route path="/analyze" element={<AnalyzePage />} />
            <Route path="/predictions-11" element={<Predictions11Page />} />
            <Route path="/soccerbuddy-12" element={<SoccerBuddy12Page />} />
          </Routes>
        </div>
      </Router>
    </ZCodeProvider>
  );
}

export default App;

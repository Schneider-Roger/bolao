import { Navigate, Route, Routes } from "react-router-dom";

import AppLayout from "./components/AppLayout";

import Login from "./pages/Login";
import PrimeiroAcesso from "./pages/PrimeiroAcesso";
import Jogos from "./pages/Jogos";
import AoVivo from "./pages/AoVivo";
import Palpite from "./pages/Palpite";
import Ranking from "./pages/Ranking";
import Perfil from "./pages/Perfil";
import Admin from "./pages/Admin";
import MataMata from "./pages/MataMata";
import PalpitesEspeciais from "./pages/PalpitesEspeciais";
import Regras from "./pages/Regras";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />

      <Route path="/login" element={<Login />} />
      <Route path="/primeiro-acesso" element={<PrimeiroAcesso />} />
      <Route path="/admin" element={<Admin />} />

      <Route element={<AppLayout />}>
        <Route path="/home" element={<Navigate to="/perfil" replace />} />
        <Route path="/aovivo" element={<AoVivo />} />
        <Route path="/jogos" element={<Jogos />} />
        <Route path="/matamata" element={<MataMata />} />
        <Route path="/especiais" element={<PalpitesEspeciais />} />
        <Route path="/palpite/:jogoId" element={<Palpite />} />
        <Route path="/ranking" element={<Ranking />} />
        <Route path="/perfil" element={<Perfil />} />
        <Route path="/regras" element={<Regras />} />
      </Route>
    </Routes>
  );
}

export default App;
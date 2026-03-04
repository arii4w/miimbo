import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { DashboardLayout } from './layouts/DashboardLayout'
import { Home } from './pages/Home'
import { Clients } from './pages/Clients'
import { Properties } from './pages/Properties'
import { Simulation } from './pages/Simulation'
import { SimulationHistory } from './pages/SimulationHistory'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { PrivateRoute } from './routes/PrivateRoute'
import { PublicRoute } from './routes/PublicRoute'

function App() {
  console.log('[MIIMBO] [App] Render')
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<Login />} />
          <Route path="/crear-cuenta" element={<Register />} />
        </Route>

        <Route element={<PrivateRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/clientes" element={<Clients />} />
            <Route path="/propiedades" element={<Properties />} />
            <Route path="/simulacion" element={<Simulation />} />
            <Route path="/historial" element={<SimulationHistory />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

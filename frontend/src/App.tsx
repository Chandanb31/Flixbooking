import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { useEffect } from "react";
import Navbar, { Footer } from "./components/Navbar";
import { NotFound, RequireAuth } from "./components/ui";
import { AuthProvider } from "./context/AuthContext";
import { CityProvider } from "./context/CityContext";
import { Login, Register } from "./pages/Auth";
import Checkout from "./pages/Checkout";
import Home from "./pages/Home";
import MovieDetail from "./pages/MovieDetail";
import MyBookings from "./pages/MyBookings";
import SeatSelect from "./pages/SeatSelect";
import Ticket from "./pages/Ticket";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CityProvider>
          <ScrollToTop />
          <div className="flex min-h-screen flex-col">
            <Navbar />
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/movies/:slug" element={<MovieDetail />} />
                <Route path="/shows/:showId" element={<SeatSelect />} />
                <Route path="/checkout/:code" element={<RequireAuth><Checkout /></RequireAuth>} />
                <Route path="/bookings" element={<RequireAuth><MyBookings /></RequireAuth>} />
                <Route path="/bookings/:code" element={<RequireAuth><Ticket /></RequireAuth>} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </CityProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

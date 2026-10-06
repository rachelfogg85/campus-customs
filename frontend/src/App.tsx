import { Route, Routes } from "react-router-dom";
import "./App.css";
import { ChatMatches } from "./components/ChatMatches";
import { ChatWidget } from "./components/ChatWidget";
import { NavBar } from "./components/NavBar";
import About from "./pages/About";
import Cart from "./pages/Cart";
import Home from "./pages/Home";
import Login from "./pages/Login";
import ProductDetail from "./pages/ProductDetail";
import Products from "./pages/Products";
import Signup from "./pages/Signup";

export default function App() {
  return (
    <div className="shell">
      <NavBar />
      <ChatMatches />

      <main className="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/:productId" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/about" element={<About />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
        </Routes>
      </main>

      <footer className="footer">
        <p>© {new Date().getFullYear()} Campus Customs — made by Bulldogs, for Bulldogs.</p>
      </footer>

      <ChatWidget />
    </div>
  );
}

import { Route, Routes } from "react-router-dom";
import { HomePage } from "./pages/HomePage.tsx";

export default function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<HomePage />} />
      </Routes>
    </div>
  );
}

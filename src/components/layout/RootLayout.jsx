import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import SecurityBanner from "../SecurityBanner";

const RootLayout = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <SecurityBanner />
      <main className="relative">
        <Outlet />
      </main>
    </div>
  );
};

export default RootLayout;

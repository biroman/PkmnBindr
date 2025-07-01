import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import SecurityBanner from "../SecurityBanner";

const RootLayout = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <SecurityBanner />
      <main className="relative">
        <Outlet />
      </main>
    </div>
  );
};

export default RootLayout;

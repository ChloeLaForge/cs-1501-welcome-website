import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import "./InternalLayout.css";

export default function InternalLayout() {
  return (
    <div className="internal-layout">
      <Sidebar />
      <main className="internal-layout__content">
        <Outlet />
      </main>
    </div>
  );
}

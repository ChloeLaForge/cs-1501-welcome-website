import { Route, Routes } from "react-router-dom";
import InternalLayout from "./layouts/InternalLayout";
import WelcomePage from "./pages/WelcomePage";
import QuestionsPage from "./pages/QuestionsPage";
import TellMeAboutYouPage from "./pages/TellMeAboutYouPage";
import AiFriendPage from "./pages/AiFriendPage";
import NotFoundPage from "./pages/NotFoundPage";
import { AI_FRIEND_PATH } from "./data/nav";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<WelcomePage />} />
      <Route element={<InternalLayout />}>
        <Route path="/questions" element={<QuestionsPage />} />
        <Route path="/tell-me-about-you" element={<TellMeAboutYouPage />} />
        <Route path={AI_FRIEND_PATH} element={<AiFriendPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

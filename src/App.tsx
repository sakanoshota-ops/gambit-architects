/**
 * アプリのルート：React Router v7 でルーティング
 *
 * 画面構成：
 *   /              ホーム
 *   /party         編成
 *   /edit/:charId  ガンビット編集（party 経由でしか入れない）
 *   /battle        戦闘
 *   /log           ログ
 *   /settings      設定
 */

import { createBrowserRouter, RouterProvider } from "react-router-dom";

import { Layout } from "./ui/layout/Layout";
import { BattleScreen } from "./ui/screens/BattleScreen";
import { GambitEditorScreen } from "./ui/screens/GambitEditorScreen";
import { HomeScreen } from "./ui/screens/HomeScreen";
import { LogScreen } from "./ui/screens/LogScreen";
import { PartyScreen } from "./ui/screens/PartyScreen";
import { SettingsScreen } from "./ui/screens/SettingsScreen";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <HomeScreen /> },
      { path: "party", element: <PartyScreen /> },
      { path: "edit/:charId", element: <GambitEditorScreen /> },
      { path: "battle", element: <BattleScreen /> },
      { path: "log", element: <LogScreen /> },
      { path: "settings", element: <SettingsScreen /> },
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;

import { Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";

import { Layout } from "./components/Layout";
import { ProjectListPage } from "./pages/ProjectListPage";
import { SourceLibraryPage } from "./pages/SourceLibraryPage";
import { InsightRunsPage } from "./pages/InsightRunsPage";
import { InsightRunViewerPage } from "./pages/InsightRunViewerPage";
import { DecisionCanvasPage } from "./pages/DecisionCanvasPage";
import { TaskBoardPage } from "./pages/TaskBoardPage";

export function App() {
  return (
    <>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<ProjectListPage />} />
          <Route path="/library" element={<SourceLibraryPage />} />
          <Route path="/runs" element={<InsightRunsPage />} />
          <Route path="/runs/:id" element={<InsightRunViewerPage />} />
          <Route path="/decisions" element={<DecisionCanvasPage />} />
          <Route path="/tasks" element={<TaskBoardPage />} />
        </Route>
      </Routes>
      <Toaster position="top-right" richColors />
    </>
  );
}

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';

import { Home } from './pages/guest/Home';
import { JournalList } from './pages/guest/JournalList';
import { ArticleList } from './pages/guest/ArticleList';
import { SurveyFill } from './pages/guest/SurveyFill';

import { Login } from './pages/admin/Login';
import { Dashboard } from './pages/admin/Dashboard';
import { JournalsManage } from './pages/admin/JournalsManage';
import { ArticlesManage } from './pages/admin/ArticlesManage';
import { ClassNotesManage } from './pages/admin/ClassNotesManage';
import { SurveysManage } from './pages/admin/SurveysManage';
import { SurveyBuilder } from './pages/admin/SurveyBuilder';
import { SurveyResults } from './pages/admin/SurveyResults';
import { AdminManage } from './pages/admin/AdminManage';

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        <Routes>
          {/* Tamu */}
          <Route path="/" element={<Home />} />
          <Route path="/jurnal" element={<JournalList />} />
          <Route path="/artikel" element={<ArticleList />} />
          <Route path="/angket/:slug" element={<SurveyFill />} />

          {/* Admin */}
          <Route path="/admin/login" element={<Login />} />
          <Route path="/admin" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/admin/jurnal" element={<ProtectedRoute><JournalsManage /></ProtectedRoute>} />
          <Route path="/admin/artikel" element={<ProtectedRoute><ArticlesManage /></ProtectedRoute>} />
          <Route path="/admin/notulensi" element={<ProtectedRoute><ClassNotesManage /></ProtectedRoute>} />
          <Route path="/admin/angket" element={<ProtectedRoute><SurveysManage /></ProtectedRoute>} />
          <Route path="/admin/angket/:id/edit" element={<ProtectedRoute><SurveyBuilder /></ProtectedRoute>} />
          <Route path="/admin/angket/:id/hasil" element={<ProtectedRoute><SurveyResults /></ProtectedRoute>} />
          <Route path="/admin/pengguna" element={<ProtectedRoute><AdminManage /></ProtectedRoute>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

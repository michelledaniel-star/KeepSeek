import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import SiteHeader from './components/SiteHeader';
import LandingPage from './components/LandingPage';
import ItemGrid from './components/ItemGrid';
import ItemDetail from './components/ItemDetail';
import PersonDetail from './components/PersonDetail';
import MobileUpload from './components/MobileUpload';
import MobileVideoRecording from './components/MobileVideoRecording';
import AddItemForm from './components/AddItemForm';
import QuestionFlow from './components/QuestionFlow';
import KeeperProfileSetup from './components/KeeperProfileSetup';
import Origins from './components/Origins';
import AuthPage from './components/AuthPage';
import AuthConfirm from './components/AuthConfirm';
import Categories from './components/Categories';
import SeekerGallery from './components/SeekerGallery';
import SeekerItemDetail from './components/SeekerItemDetail';
import SeekerOrigins from './components/SeekerOrigins';
import SeekerAuthPage from './components/SeekerAuthPage';
import SeekerDashboard from './components/SeekerDashboard';
import SeekerPersonDetail from './components/SeekerPersonDetail';
import SeekerCategories from './components/SeekerCategories';

function ProtectedApp() {
  const { user, userType, profileComplete, markProfileComplete } = useAuth();

  function Protected({ children }) {
    if (!user) return <Navigate to="/auth" replace />;
    if (profileComplete === false) return <Navigate to="/profile/setup" replace />;
    return children;
  }

  function FlowTestWrapper() {
    const navigate = useNavigate();
    const testQuestions = [
      { id: 'q1', field: 'name', prompt: 'What is this?' },
      { id: 'q2', field: 'owner', prompt: 'Who gave it to you, or where is it from?' },
      { id: 'q3', field: 'story', prompt: "What's the story behind it?" },
      { id: 'q4', field: 'beneficiary', prompt: 'Who do you want to have this someday?' },
    ];
    return (
      <QuestionFlow
        questions={testQuestions}
        onCancel={() => navigate('/viewer')}
        onComplete={(answers) => {
          console.log('Flow test answers:', answers);
          alert('Answers captured (check browser console):\n\n' + JSON.stringify(answers, null, 2));
          navigate('/viewer');
        }}
      />
    );
  }

  function AddItemFormWrapper() {
    const navigate = useNavigate();
    return (
      <AddItemForm
        onClose={() => navigate(-1)}
        onSuccess={(savedItem) => {
          if (savedItem?.id) {
            navigate(`/item/${savedItem.id}`, { replace: true });
          } else {
            navigate('/viewer', { replace: true });
          }
        }}
      />
    );
  }

  return (
    <Routes>
      <Route path="/" element={
        user && userType === 'keeper'
          ? <Navigate to={profileComplete === false ? "/profile/setup" : "/viewer"} replace />
          : <LandingPage />
      } />
      <Route path="/profile/setup" element={
        !user
          ? <Navigate to="/auth" replace />
          : <KeeperProfileSetup onComplete={markProfileComplete} />
      } />
      <Route path="/s/:slug/gallery" element={<SeekerGallery />} />
      <Route path="/s/:slug/item/:id" element={<SeekerItemDetail />} />
      <Route path="/s/:slug/connections" element={<SeekerOrigins />} />
      <Route path="/s/:slug/categories" element={<SeekerCategories />} />
      <Route path="/s/:slug/person/:personId" element={<SeekerPersonDetail />} />
      <Route path="/seeker" element={<SeekerDashboard />} />
      <Route path="/viewer" element={<Protected><ItemGrid /></Protected>} />
      <Route path="/curator" element={<Protected><Categories /></Protected>} />
      <Route path="/add" element={
        <Protected>
          <AddItemFormWrapper />
        </Protected>
      } />
      <Route path="/flow-test" element={
        <Protected>
          <FlowTestWrapper />
        </Protected>
      } />
      <Route path="/item/:id" element={
        <Protected>
          <ItemDetail />
        </Protected>
      } />
      <Route path="/connections" element={<Protected><Origins /></Protected>} />
      <Route path="/person/:personId" element={<Protected><PersonDetail /></Protected>} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/auth/confirm" element={<AuthConfirm />} />
          <Route path="/s/:slug" element={<SeekerAuthPage />} />
          <Route path="/s/:slug/join" element={<SeekerAuthPage />} />
          <Route path="/mobile-upload" element={<MobileUpload />} />
          <Route path="/mobile-video" element={<MobileVideoRecording />} />
          <Route path="/*" element={<ProtectedApp />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
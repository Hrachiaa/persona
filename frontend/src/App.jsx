import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import Onboarding from './pages/Onboarding';
import Register from './pages/Register';
import Survey from './pages/Survey';
import Dashboard from './pages/Dashboard';

const SCREENS = {
  ONBOARDING: 'onboarding',
  REGISTER: 'register',
  SURVEY: 'survey',
  DASHBOARD: 'dashboard',
};

export default function App() {
  const [screen, setScreen] = useState(SCREENS.ONBOARDING);
  const [userData, setUserData] = useState({ name: '', birthYear: '' });

  const navigate = (to) => setScreen(to);

  return (
    <div className="min-h-screen bg-persona-bg">
      <AnimatePresence mode="wait">
        {screen === SCREENS.ONBOARDING && (
          <Onboarding key="onboarding" onComplete={() => navigate(SCREENS.REGISTER)} />
        )}
        {screen === SCREENS.REGISTER && (
          <Register key="register" onComplete={() => navigate(SCREENS.SURVEY)} />
        )}
        {screen === SCREENS.SURVEY && (
          <Survey
            key="survey"
            userData={userData}
            setUserData={setUserData}
            onComplete={() => navigate(SCREENS.DASHBOARD)}
          />
        )}
        {screen === SCREENS.DASHBOARD && (
          <Dashboard key="dashboard" userData={userData} />
        )}
      </AnimatePresence>
    </div>
  );
}

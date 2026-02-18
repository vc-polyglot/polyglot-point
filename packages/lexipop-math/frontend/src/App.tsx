import { useState } from 'react';
import MathExercise from './components/MathExercise';
import Login from './components/Login';
import './App.css';

type Language = 'es' | 'en' | 'fr' | 'de' | 'pt' | 'it';

interface User {
  id: string;
  email: string;
  displayName: string;
  avatar?: string;
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [lang, setLang] = useState<Language>('es');

  if (!user) {
    return <Login onLoginSuccess={setUser} lang={lang} />;
  }

  return (
    <div className="app">
      <MathExercise />
    </div>
  );
}

export default App;

import AuthScreen from './AuthScreen';

export default function Register({ onComplete, onLogin }) {
  return <AuthScreen mode="register" onComplete={onComplete} onSwitch={onLogin} />;
}

import AuthScreen from './AuthScreen';

export default function Login({ onComplete, onRegister, onForgotPassword }) {
  return (
    <AuthScreen
      mode="login"
      onComplete={onComplete}
      onSwitch={onRegister}
      onForgotPassword={onForgotPassword}
    />
  );
}

import { useState } from 'react';
import { motion } from 'framer-motion';
import { HiOutlineEnvelope, HiOutlineLockClosed, HiOutlineEye, HiOutlineEyeSlash } from 'react-icons/hi2';

export default function Register({ onComplete }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    onComplete();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen bg-persona-bg flex flex-col items-center justify-center px-6 py-12"
    >
      <div className="w-full max-w-md">
        {/* Header */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-center mb-10"
        >
          <h1 className="text-2xl font-bold tracking-tight text-persona-dark flex items-center justify-center gap-2 mb-6">
            <span className="text-3xl">λ</span> Persona
          </h1>
          <h2 className="text-3xl font-bold text-persona-dark mb-2">Create Account</h2>
          <p className="text-persona-muted">Start your personality journey today</p>
        </motion.div>

        {/* Form */}
        <motion.form
          onSubmit={handleSubmit}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          {/* Email */}
          <div className="relative">
            <HiOutlineEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field pl-12"
            />
          </div>

          {/* Password */}
          <div className="relative">
            <HiOutlineLockClosed className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field pl-12 pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showPassword ? <HiOutlineEyeSlash className="w-5 h-5" /> : <HiOutlineEye className="w-5 h-5" />}
            </button>
          </div>

          {/* Sign Up Button */}
          <motion.button
            type="submit"
            className="btn-primary w-full text-center text-lg mt-6"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
          >
            Sign Up
          </motion.button>
        </motion.form>

        {/* Divider */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex items-center gap-4 my-8"
        >
          <div className="flex-1 h-px bg-gray-300" />
          <span className="text-sm text-persona-muted">or continue with</span>
          <div className="flex-1 h-px bg-gray-300" />
        </motion.div>

        {/* Social Buttons */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex gap-3"
        >
          {['Google', 'Apple'].map((provider) => (
            <motion.button
              key={provider}
              onClick={onComplete}
              className="btn-secondary flex-1 text-center py-3"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
            >
              {provider}
            </motion.button>
          ))}
        </motion.div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center text-sm text-persona-muted mt-8"
        >
          Already have an account?{' '}
          <button className="text-persona-dark font-semibold hover:underline">
            Sign In
          </button>
        </motion.p>
      </div>
    </motion.div>
  );
}

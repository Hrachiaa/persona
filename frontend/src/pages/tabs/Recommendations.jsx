import { motion } from 'framer-motion';
import { HiOutlineBookOpen, HiOutlineFilm } from 'react-icons/hi2';

const books = [
  {
    title: 'Thinking, Fast and Slow',
    author: 'Daniel Kahneman',
    reason: 'Perfect for your analytical mind — explores the two systems that drive the way we think.',
    color: 'bg-persona-accent-lavender',
    emoji: '🧠',
  },
  {
    title: 'Quiet: The Power of Introverts',
    author: 'Susan Cain',
    reason: 'Validates your introverted strengths and shows how quiet people move the world.',
    color: 'bg-persona-accent-blue',
    emoji: '🤫',
  },
  {
    title: 'The Art of Strategy',
    author: 'Avinash Dixit',
    reason: 'Feeds your strategic nature with game theory applied to everyday decisions.',
    color: 'bg-persona-accent-yellow',
    emoji: '♟️',
  },
  {
    title: 'Deep Work',
    author: 'Cal Newport',
    reason: 'Aligns with your preference for focused, meaningful productivity.',
    color: 'bg-persona-accent-lime',
    emoji: '🎯',
  },
  {
    title: 'Atomic Habits',
    author: 'James Clear',
    reason: 'Your systematic nature will love this framework for building better habits.',
    color: 'bg-persona-accent-pink',
    emoji: '⚡',
  },
];

const films = [
  {
    title: 'The Imitation Game',
    year: '2014',
    reason: 'A brilliant mind working to crack an impossible code — you\'ll relate to Turing\'s focus.',
    color: 'bg-persona-accent-yellow',
    emoji: '🔐',
  },
  {
    title: 'Interstellar',
    year: '2014',
    reason: 'Appeals to your visionary thinking and love for complex, layered storytelling.',
    color: 'bg-persona-accent-lavender',
    emoji: '🚀',
  },
  {
    title: 'A Beautiful Mind',
    year: '2001',
    reason: 'The struggle and triumph of a brilliant analytical mind will deeply resonate.',
    color: 'bg-persona-accent-blue',
    emoji: '🧮',
  },
  {
    title: 'Ex Machina',
    year: '2014',
    reason: 'Your fascination with intelligence and systems makes this a perfect match.',
    color: 'bg-persona-accent-lime',
    emoji: '🤖',
  },
  {
    title: 'The Social Network',
    year: '2010',
    reason: 'Strategic thinking, independence, and ambition — themes that mirror your type.',
    color: 'bg-persona-accent-pink',
    emoji: '💻',
  },
];

function HorizontalCards({ items, type }) {
  return (
    <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2 -mx-6 px-6">
      {items.map((item, i) => (
        <motion.div
          key={item.title}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 + i * 0.1 }}
          className="min-w-[260px] max-w-[260px] shrink-0"
        >
          <motion.div
            className="surface-warm rounded-3xl overflow-hidden h-full"
            whileHover={{ y: -4 }}
            transition={{ type: 'spring', stiffness: 400 }}
          >
            {/* Cover */}
            <div className={`${item.color} h-36 flex items-center justify-center relative`}>
              <span className="text-6xl">{item.emoji}</span>
              <div className="absolute top-3 right-3 bg-white/80 backdrop-blur-sm rounded-md px-2.5 py-1 text-[10px] font-medium tracking-wide text-persona-muted">
                {type === 'book' ? 'Book' : 'Film'}
              </div>
            </div>
            {/* Info */}
            <div className="p-5">
              <h3 className="font-display text-base font-semibold text-persona-dark mb-1 leading-tight">{item.title}</h3>
              <p className="text-xs text-persona-muted mb-3 tabular">
                {type === 'book' ? item.author : item.year}
              </p>
              <p className="text-xs text-persona-muted leading-relaxed">
                {item.reason}
              </p>
            </div>
          </motion.div>
        </motion.div>
      ))}
    </div>
  );
}

export default function Recommendations() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="px-6 pt-14 pb-6"
    >
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="font-display text-4xl font-semibold text-persona-dark mb-1">For you</h1>
        <p className="text-persona-muted mb-8">Books and films chosen for INTJ.</p>
      </motion.div>

      {/* Books Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="mb-10"
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-persona-accent-yellow rounded-lg flex items-center justify-center">
            <HiOutlineBookOpen className="w-5 h-5 text-persona-dark" />
          </div>
          <h2 className="text-xl font-semibold text-persona-dark">Books</h2>
        </div>
        <HorizontalCards items={books} type="book" />
      </motion.div>

      {/* Films Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-persona-accent-lavender rounded-lg flex items-center justify-center">
            <HiOutlineFilm className="w-5 h-5 text-persona-dark" />
          </div>
          <h2 className="text-xl font-semibold text-persona-dark">Films</h2>
        </div>
        <HorizontalCards items={films} type="film" />
      </motion.div>
    </motion.div>
  );
}

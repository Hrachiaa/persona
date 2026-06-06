// Tailwind-styled renderers so AI-generated Markdown matches the persona design
// tokens. Shared by the per-test interpretation and the combined portrait.
export const MARKDOWN_COMPONENTS = {
  h1: ({ children }) => (
    <h1 className="font-display text-2xl font-semibold text-persona-dark mt-6 mb-3 first:mt-0">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="font-display text-lg font-semibold text-persona-dark mt-5 mb-2">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="font-display text-base font-semibold text-persona-dark mt-4 mb-2">{children}</h3>
  ),
  p: ({ children }) => <p className="text-sm text-persona-dark/80 leading-relaxed mb-3">{children}</p>,
  ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1.5">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1.5">{children}</ol>,
  li: ({ children }) => <li className="text-sm text-persona-dark/80 leading-relaxed">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-persona-dark">{children}</strong>,
  hr: () => <hr className="border-persona-line/60 my-4" />,
};

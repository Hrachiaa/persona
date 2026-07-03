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
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="underline decoration-persona-dark/30 underline-offset-2 hover:decoration-persona-dark transition-colors"
    >
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-persona-dark/20 pl-4 my-3 text-persona-dark/70 [&_p]:mb-1.5">
      {children}
    </blockquote>
  ),
  // Fenced blocks get the dark card; the inner <code> resets so inline styling
  // below never leaks into them.
  pre: ({ children }) => (
    <pre className="bg-persona-dark text-persona-bg rounded-2xl px-4 py-3.5 my-3 overflow-x-auto text-[13px] leading-relaxed [&_code]:bg-transparent [&_code]:border-0 [&_code]:p-0 [&_code]:text-inherit [&_code]:text-[13px]">
      {children}
    </pre>
  ),
  code: ({ children }) => (
    <code className="bg-persona-dark/[0.06] border border-persona-line/70 rounded-md px-1.5 py-0.5 text-[0.85em] text-persona-dark">
      {children}
    </code>
  ),
};

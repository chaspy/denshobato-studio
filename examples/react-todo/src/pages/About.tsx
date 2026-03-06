
export function About() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">About</h1>
      <div className="prose">
        <p className="text-gray-600 mb-4">
          This is a sample Todo application built to demonstrate Denshobato Studio.
        </p>
        <h2 className="text-lg font-semibold text-gray-800 mb-2">Tech Stack</h2>
        <ul className="list-disc list-inside text-gray-600 space-y-1">
          <li>React 19</li>
          <li>TypeScript</li>
          <li>Tailwind CSS</li>
          <li>React Router</li>
          <li>Vite</li>
        </ul>
        <h2 className="text-lg font-semibold text-gray-800 mt-6 mb-2">
          Using Denshobato Studio
        </h2>
        <p className="text-gray-600 mb-4">
          Click the element selector button in the overlay, then click any UI element
          to select it. Use the chat panel to describe changes you want to make.
          The AI will modify the source code and Vite&apos;s HMR will update the browser
          instantly.
        </p>
      </div>
    </div>
  );
}

import React from 'react';
import PhysicsSimulator from './PhysicsSimulator';

function App() {
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto py-4 px-4">
          <h1 className="text-2xl font-bold text-gray-900">Physics Sandbox</h1>
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="h-[600px]">
          <PhysicsSimulator />
        </div>
      </main>
    </div>
  );
}

export default App;

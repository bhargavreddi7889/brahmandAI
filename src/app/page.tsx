import Dashboard from '@/components/Dashboard';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="py-2">
        <Dashboard />
      </div>
      <footer className="mt-auto py-4 text-center text-xs text-gray-500">
        <p>© {new Date().getFullYear()} AI Dashboard • All Rights Reserved</p>
      </footer>
    </main>
  );
}

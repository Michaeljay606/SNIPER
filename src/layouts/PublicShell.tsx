import { Outlet } from 'react-router-dom';

export default function PublicShell() {
  return (
    <div className="min-h-screen bg-[#08090d] text-white">
      <main>
        <Outlet />
      </main>
    </div>
  );
}

export default function Navbar({ onLogout }) {
    return (
        <nav className="bg-blue-600 text-white px-4 py-2 flex justify-between items-center">
            <span className="font-bold text-lg">Student Finance Dashboard</span>
            <button
                onClick={onLogout}
                className="bg-white text-blue-600 px-3 py-1 rounded"
            >
                Logout
            </button>
        </nav>
    );
}

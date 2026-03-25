export default function StatCard({ label, value }) {
    return (
        <div className="bg-white shadow rounded p-4 flex flex-col items-center">
            <span className="text-gray-500">{label}</span>
            <span className="text-xl font-bold">{value}</span>
        </div>
    );
}

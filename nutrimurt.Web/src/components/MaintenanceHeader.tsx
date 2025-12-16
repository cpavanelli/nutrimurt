import { Link } from 'react-router-dom';

export default function MaintenanceHeader({title, addNewTitle, openCreate }: 
    { title: string; addNewTitle: string; openCreate: () => void }) {
    return (


        <header className="border-b border-slate-800 bg-slate-900">
            <div className="mx-auto max-w-5xl space-y-3 px-6 py-4">
                <Link to="/" className="inline-flex items-center text-sm text-slate-400 hover:text-slate-200">Voltar</Link>
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold">{title}</h1>
                    <button
                        onClick={openCreate}
                        className="rounded bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-400"
                    >
                        + {addNewTitle}
                    </button>
                </div>
            </div>
        </header>
    );
}

import { useState, FormEvent } from 'react';
import type { Patient, PatientInput } from './types';
import { IMaskInput } from 'react-imask';
interface Props {
    initial?: Patient | null;
    onSubmit(payload: PatientInput): void;
    onCancel(): void;
    submitting?: boolean;
}

const empty: PatientInput = {
    name: '',
    email: '',
    phone: '',
    birth: '',
    weight: 0,
    height: 0,
};

export default function PatientForm({ initial, onSubmit, onCancel, submitting }: Props) {
    const [form, setForm] = useState<PatientInput>(initial ? {
        name: initial.name,
        email: initial.email,
        phone: initial.phone,
        birth: initial.birth ?? '',
        weight: initial.weight,
        height: initial.height,
    } : empty);

    function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
        const { name, value } = event.target;
        setForm((prev) => ({
            ...prev,
            [name]: name === 'weight' || name === 'height' ? Number(value) : value,
        }));
    }

    function handleSubmit(event: FormEvent) {
        event.preventDefault();
        onSubmit(form);
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {['name', 'email'].map((field) => (
                <div key={field}>
                    <label className="block text-sm font-medium text-slate-200 capitalize">{field != "name"?field : "Nome"  }</label>
                    <input
                        name={field}
                        value={(form as any)[field]}
                        onChange={handleChange}
                        className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white"
                        // required={field !== 'phone'}
                        required={true}
                        type={field === 'email' ? 'email' : 'text'}
                    />
                </div>
            ))}

            <div>
                <label className="block text-sm font-medium text-slate-200">Celular</label>
                <IMaskInput
                    mask="(00)00000-0000"
                    value={form.phone}
                    onAccept={(value) => setForm((prev) => ({ ...prev, phone: value }))}
                    unmask={false} // keep formatted value
                    className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white"
                    placeholder="(11)12345-6789"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-200">Data de Nascimento</label>
                <input
                    type="date"
                    name="birth"
                    value={form.birth ?? ''}
                    onChange={handleChange}
                    className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white"
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                {(['weight', 'height'] as const).map((field) => (
                    <div key={field}>
                        <label className="block text-sm font-medium text-slate-200 capitalize">{field == "weight"?"Peso" : "Altura"  }</label>
                        <input
                            type="number"
                            name={field}
                            value={(form as any)[field] ?? 0}
                            onChange={handleChange}
                            className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white"
                        />
                    </div>
                ))}
            </div>

            <div className="flex justify-end gap-3 pt-4">
                <button
                    type="button"
                    onClick={onCancel}
                    className="rounded border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={submitting}
                    className="rounded bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-400 disabled:opacity-60"
                >
                    {submitting ? 'Saving...' : 'Save'}
                </button>
            </div>
        </form>
    );
}

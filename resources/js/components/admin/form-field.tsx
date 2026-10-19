import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Props = {
    label: string;
    error?: string;
    children?: React.ReactNode;
};

export function Field({ label, error, children }: Props) {
    return (
        <div className="grid gap-2">
            <Label>{label}</Label>
            {children}
            {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
    );
}

export function TextField({
    value,
    onChange,
    type = 'text',
}: {
    value: any;
    onChange: (v: any) => void;
    type?: string;
}) {
    return (
        <Input
            type={type}
            value={value ?? ''}
            onChange={(e) =>
                onChange(
                    type === 'number' ? Number(e.target.value) : e.target.value,
                )
            }
        />
    );
}

import { Button } from '@/components/ui/button';

type Props = {
    children: React.ReactNode;
};

export function RowActions({ children }: Props) {
    return <div className="inline-flex items-center gap-2">{children}</div>;
}

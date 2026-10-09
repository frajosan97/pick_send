// resources/js/types/config.ts

export type Config = {
    wa: string;
    constants: {
        base10: number;
        perKg: number;
        maxKg: number;
        codFeeRate: number;
        pointsRate: number;
        pointsValue: number;
        pointsMin: number;
        returnDays: number;
        dropOffFee: number; // ← added (PHP already returns this)
    };
    routes: Record<string, string>; // { coast: 'Mombasa route', ... }
    towns: Array<[string, string[]]>; // [['coast', ['Mombasa', ...]], ...]
    satellites: string[]; // ['Kahawa West', ...]
    general: Array<{
        id: string; // '1', '2', '5', '10', 'kg'
        label: string;
        p: number; // delivery price in KSh
        pack: number; // packaging fee
        pu: number; // pickup fee
        perKg: boolean | null; // true only for the 'kg' tier
    }>;
    elec: Array<{
        group: string;
        items: Array<{
            id: string; // 'acc', 'phone', 'tv43', ...
            label: string;
            p: number;
            pack: number;
            pu: number;
        }>;
    }>;
    faq: Array<[string, string]>;
};

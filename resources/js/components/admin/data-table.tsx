import DataTable, { Column } from "datatables.net-react";
import DtCore from "datatables.net-dt";
import "datatables.net-dt/css";
import { useMemo } from "react";
import type { ComponentProps } from "react";
import type { Options } from "datatables.net";

DataTable.use(DtCore);

const defaultOptions: Options = {
    pageLength: 10,
    lengthMenu: [10, 25, 50, 100],
    language: {
        search: "Search:",
        lengthMenu: "Show _MENU_ entries",
        info: "Showing _START_ to _END_ of _TOTAL_ entries",
        infoEmpty: "No records yet.",
        infoFiltered: "(filtered from _MAX_ total entries)",
        zeroRecords: "No matching records found.",
        paginate: { previous: "Previous", next: "Next" },
    },
};

// Compact presets for dashboards / summary tables
const compactOptions: Options = {
    paging: false,
    searching: false,
    info: false,
    lengthChange: false,
    ordering: true,
    autoWidth: false,
    language: { zeroRecords: "No data in this range." },
};

type SharedDataTableProps = Omit<
    ComponentProps<typeof DataTable>,
    "options"
> & {
    options?: Options;
    /** Compact mode: no paging, no search, no info — for summary tables. */
    compact?: boolean;
};

export default function SharedDataTable({
    options,
    compact = false,
    children,
    ...props
}: SharedDataTableProps) {
    const merged = useMemo<Options>(() => {
        if (compact) {
            return { ...compactOptions, ...options };
        }
        return { ...defaultOptions, ...options };
    }, [options, compact]);

    return (
        <DataTable {...props} options={merged}>
            {children}
        </DataTable>
    );
}

export { Column };

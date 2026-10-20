// resources/js/components/admin/data-table.tsx
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
    autoWidth: false,
    scrollCollapse: true,
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

const compactOptions: Options = {
    paging: false,
    searching: false,
    info: false,
    lengthChange: false,
    ordering: true,
    autoWidth: false,
    scrollCollapse: true,
    language: { zeroRecords: "No data in this range." },
};

type SharedDataTableProps = Omit<
    ComponentProps<typeof DataTable>,
    "options"
> & {
    options?: Options;
    compact?: boolean;
    /**
     * Vertical scroll height. Defaults to `'420px'` in full mode,
     * `'220px'` in compact mode. Pass `false` to disable scrolling
     * (e.g. when the parent already scrolls).
     */
    scrollY?: string | false;
};

export default function SharedDataTable({
    options,
    compact = false,
    scrollY,
    children,
    ...props
}: SharedDataTableProps) {
    const merged = useMemo<Options>(() => {
        const base = compact ? compactOptions : defaultOptions;
        const desired =
            scrollY === false
                ? undefined
                : (scrollY ?? (compact ? "220px" : "420px"));

        return {
            ...base,
            ...options,
            ...(desired
                ? {
                      scrollY: desired,
                      scrollCollapse: true,
                  }
                : {}),
        };
    }, [options, compact, scrollY]);

    return (
        <div className="ps-datatable">
            <DataTable {...props} options={merged}>
                {children}
            </DataTable>
        </div>
    );
}

export { Column };

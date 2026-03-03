import React from 'react';
import {
    Table as ShadcnTable,
    TableHeader,
    TableBody,
    TableFooter,
    TableHead,
    TableRow,
    TableCell,
    TableCaption,
} from "./ui/table"

export function Table({ children, className, ...props }) {
    return (
        <div className="overflow-x-auto w-full relative">
            <ShadcnTable className={className} {...props}>
                {children}
            </ShadcnTable>
        </div>
    );
}

// Flowbite-compatible composite structure
Table.Head = TableHeader;
Table.Body = TableBody;
Table.Row = TableRow;
Table.Cell = TableCell;
Table.HeadCell = ({ children, className, ...props }) => (
    <TableHead className={className} {...props}>
        {children}
    </TableHead>
);

export default Table;

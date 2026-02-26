// ============================================
// Table Block - Modern inline editing with connections
// ============================================

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, MoreHorizontal, Trash2, ArrowLeft, ArrowRight, GripVertical, ArrowRightLeft } from 'lucide-react';
import type { TableBlockData, TableColumn, TableRow, Block } from '@/types';

interface TableBlockProps {
  data: TableBlockData;
  onUpdate: (data: Partial<TableBlockData>) => void;
  isSelected?: boolean;
  onStartConnection?: () => void;
  isConnecting?: boolean;
  connectedBlocks?: string[];
  onCardMoveToBlock?: (card: any, targetBlockId: string) => void;
  allBlocks?: Block[];
}

export function TableBlock({ 
  data, 
  onUpdate,
  connectedBlocks = [],
  onCardMoveToBlock,
  allBlocks = []
}: TableBlockProps) {
  const [draggedRow, setDraggedRow] = useState<TableRow | null>(null);

  const handleAddColumn = useCallback(() => {
    const newColumn: TableColumn = {
      id: crypto.randomUUID(),
      name: `Column ${data.columns.length + 1}`,
      type: 'text',
    };

    const updatedRows = data.rows.map((row) => ({
      ...row,
      cells: { ...row.cells, [newColumn.id]: '' },
    }));

    onUpdate({
      columns: [...data.columns, newColumn],
      rows: updatedRows,
    });
  }, [data.columns, data.rows, onUpdate]);

  const handleAddRow = useCallback(() => {
    const newRow: TableRow = {
      id: crypto.randomUUID(),
      cells: {},
    };

    data.columns.forEach((col) => {
      newRow.cells[col.id] = col.type === 'checkbox' ? false : '';
    });

    onUpdate({ rows: [...data.rows, newRow] });
  }, [data.columns, data.rows, onUpdate]);

  const handleUpdateCell = useCallback(
    (rowId: string, colId: string, value: any) => {
      const updatedRows = data.rows.map((row) =>
        row.id === rowId ? { ...row, cells: { ...row.cells, [colId]: value } } : row
      );
      onUpdate({ rows: updatedRows });
    },
    [data.rows, onUpdate]
  );

  const handleUpdateColumnName = useCallback(
    (colId: string, name: string) => {
      const updatedColumns = data.columns.map((col) =>
        col.id === colId ? { ...col, name } : col
      );
      onUpdate({ columns: updatedColumns });
    },
    [data.columns, onUpdate]
  );

  const handleDeleteColumn = useCallback(
    (colId: string) => {
      const updatedColumns = data.columns.filter((c) => c.id !== colId);
      const updatedRows = data.rows.map((row) => {
        const { [colId]: _, ...restCells } = row.cells;
        return { ...row, cells: restCells };
      });
      onUpdate({ columns: updatedColumns, rows: updatedRows });
    },
    [data.columns, data.rows, onUpdate]
  );

  const handleDeleteRow = useCallback(
    (rowId: string) => {
      onUpdate({ rows: data.rows.filter((r) => r.id !== rowId) });
    },
    [data.rows, onUpdate]
  );

  const handleMoveColumn = useCallback(
    (colId: string, direction: 'left' | 'right') => {
      const index = data.columns.findIndex((c) => c.id === colId);
      if (index === -1) return;

      const newIndex = direction === 'left' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= data.columns.length) return;

      const updatedColumns = [...data.columns];
      [updatedColumns[index], updatedColumns[newIndex]] = [
        updatedColumns[newIndex],
        updatedColumns[index],
      ];

      onUpdate({ columns: updatedColumns });
    },
    [data.columns, onUpdate]
  );

  // Drag and drop for rows
  const handleDragStart = (row: TableRow) => {
    setDraggedRow(row);
  };

  const handleDragOver = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (!draggedRow) return;

    const currentIndex = data.rows.findIndex(r => r.id === draggedRow.id);
    if (currentIndex === targetIndex) return;

    const newRows = [...data.rows];
    newRows.splice(currentIndex, 1);
    newRows.splice(targetIndex, 0, draggedRow);
    
    onUpdate({ rows: newRows });
  };

  const handleDragEnd = () => {
    setDraggedRow(null);
  };

  const connectedKanbanBlocks = allBlocks.filter(b => 
    connectedBlocks.includes(b.id) && b.type === 'kanban'
  );

  return (
    <div className="flex flex-col h-full">
      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              {/* Drag handle column */}
              <th className="w-8 p-2 border-b border-gray-200"></th>
              {data.columns.map((col, index) => (
                <th key={col.id} className="p-2 border-b border-gray-200 min-w-[120px]">
                  <div className="flex items-center gap-1">
                    <Input
                      value={col.name}
                      onChange={(e) => handleUpdateColumnName(col.id, e.target.value)}
                      className="h-7 text-xs font-semibold bg-transparent border-0 px-1 hover:bg-white focus:bg-white focus:ring-1"
                    />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 hover:opacity-100">
                          <MoreHorizontal className="w-3 h-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleMoveColumn(col.id, 'left')}
                          disabled={index === 0}
                        >
                          <ArrowLeft className="w-4 h-4 mr-2" />
                          Move Left
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleMoveColumn(col.id, 'right')}
                          disabled={index === data.columns.length - 1}
                        >
                          <ArrowRight className="w-4 h-4 mr-2" />
                          Move Right
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteColumn(col.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Column
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </th>
              ))}
              <th className="p-2 border-b border-gray-200 w-10">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleAddColumn}>
                  <Plus className="w-4 h-4" />
                </Button>
              </th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, index) => (
              <tr 
                key={row.id} 
                className="hover:bg-gray-50 group"
                draggable
                onDragStart={() => handleDragStart(row)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
              >
                <td className="p-2 border-b border-gray-100">
                  <GripVertical className="w-4 h-4 text-gray-300 cursor-grab" />
                </td>
                {data.columns.map((col) => (
                  <td key={col.id} className="p-2 border-b border-gray-100">
                    {col.type === 'checkbox' ? (
                      <Checkbox
                        checked={!!row.cells[col.id]}
                        onCheckedChange={(checked) =>
                          handleUpdateCell(row.id, col.id, checked)
                        }
                      />
                    ) : (
                      <Input
                        value={row.cells[col.id] || ''}
                        onChange={(e) => handleUpdateCell(row.id, col.id, e.target.value)}
                        className="h-7 text-xs bg-transparent border-0 px-1 hover:bg-white focus:bg-white focus:ring-1"
                      />
                    )}
                  </td>
                ))}
                <td className="border-b border-gray-100">
                  <div className="flex items-center gap-1">
                    {connectedKanbanBlocks.length > 0 && onCardMoveToBlock && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100">
                            <ArrowRightLeft className="w-3 h-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {connectedKanbanBlocks.map((block) => (
                            <DropdownMenuItem
                              key={block.id}
                              onClick={() => onCardMoveToBlock(row, block.id)}
                            >
                              Move to {(block.data as any).title || 'Kanban'}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100"
                      onClick={() => handleDeleteRow(row.id)}
                    >
                      <Trash2 className="w-3 h-3 text-red-500" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {data.rows.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">
            No rows yet. Add one below.
          </div>
        )}
      </div>

      {/* Add Row Button */}
      <div className="p-2 border-t border-gray-100">
        <Button variant="ghost" size="sm" className="w-full justify-start" onClick={handleAddRow}>
          <Plus className="w-4 h-4 mr-2" />
          Add Row
        </Button>
      </div>
    </div>
  );
}

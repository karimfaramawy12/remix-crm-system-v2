import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  Plus, 
  MoreHorizontal, 
  ChevronLeft, 
  ChevronRight,
  Edit,
  Trash2,
  Eye
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useI18n } from '../i18n';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface Column<T> {
  header: string;
  accessor: keyof T | ((item: T) => React.ReactNode);
  className?: string;
}

interface DataTableProps<T> {
  title: string;
  data: T[];
  columns: Column<T>[];
  onAdd?: () => void;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  onView?: (item: T) => void;
  renderActions?: (item: T) => React.ReactNode;
  isLoading?: boolean;
}

export default function DataTable<T extends { id: string }>({ 
  title, 
  data, 
  columns, 
  onAdd, 
  onEdit, 
  onDelete, 
  onView,
  renderActions,
  isLoading 
}: DataTableProps<T>) {
  const { t, isRtl } = useI18n();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filteredData = data.filter(item => 
    JSON.stringify(item).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm shadow-slate-200/20 overflow-hidden transition-colors duration-300">
      <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-black">{title}</h2>
          <p className="text-sm text-black">
            {t('recordsFound', { count: filteredData.length })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className={cn("absolute top-1/2 -translate-y-1/2 text-black w-4 h-4", isRtl ? "right-3" : "left-3")} />
            <input 
              type="text" 
              placeholder={t('search')} 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className={cn(
                "py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 text-black outline-none transition-all w-full sm:w-64",
                isRtl ? "pr-10 pl-4" : "pl-10 pr-4"
              )}
            />
          </div>
          <button className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-black hover:bg-slate-100 transition-all">
            <Filter size={20} />
          </button>
          <button className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-black hover:bg-slate-100 transition-all">
            <Download size={20} />
          </button>
          {onAdd && (
            <button 
              onClick={onAdd}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
            >
              <Plus size={18} />
              <span>{t('addNew')}</span>
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className={cn("w-full border-collapse", isRtl ? "text-right" : "text-left")}>
          <thead>
            <tr className="bg-slate-50/50">
              {columns.map((col, i) => (
                <th key={i} className={cn("px-6 py-4 text-xs font-bold text-black uppercase tracking-wider", col.className)}>
                  {col.header}
                </th>
              ))}
              <th className={cn("px-6 py-4 text-xs font-bold text-black uppercase tracking-wider", isRtl ? "text-left" : "text-right")}>
                {t('actions')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              [1,2,3,4,5].map(i => (
                <tr key={i} className="animate-pulse">
                  {columns.map((_, j) => (
                    <td key={j} className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-full"></div></td>
                  ))}
                  <td className="px-6 py-4"><div className={cn("h-4 bg-slate-100 rounded w-8", isRtl ? "mr-auto" : "ml-auto")}></div></td>
                </tr>
              ))
            ) : paginatedData.length > 0 ? (
              paginatedData.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                  {columns.map((col, i) => (
                    <td key={i} className={cn("px-6 py-4 text-sm text-black", col.className)}>
                      {typeof col.accessor === 'function' ? col.accessor(item) : (item[col.accessor] as React.ReactNode)}
                    </td>
                  ))}
                  <td className={cn("px-6 py-4", isRtl ? "text-left" : "text-right")}>
                    <div className={cn("flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity", isRtl ? "justify-start" : "justify-end")}>
                      {renderActions && renderActions(item)}
                      {onView && (
                        <button onClick={() => onView(item)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">
                          <Eye size={16} />
                        </button>
                      )}
                      {onEdit && (
                        <button onClick={() => onEdit(item)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                          <Edit size={16} />
                        </button>
                      )}
                      {onDelete && (
                        <button onClick={() => onDelete(item)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length + 1} className="px-6 py-12 text-center text-slate-500">
                  {t('noRecords')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/30">
        <p className="text-sm text-black">
          {t('showingResults', { 
            start: (currentPage - 1) * itemsPerPage + 1, 
            end: Math.min(currentPage * itemsPerPage, filteredData.length), 
            total: filteredData.length 
          })}
        </p>
        <div className="flex items-center gap-2">
          <button 
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => prev - 1)}
            className="p-2 border border-slate-200 rounded-xl disabled:opacity-50 bg-white hover:bg-slate-50 transition-all text-black"
          >
            {isRtl ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={cn(
                   "w-9 h-9 text-sm font-semibold rounded-xl transition-all",
                   currentPage === page 
                     ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" 
                     : "text-black hover:bg-slate-50 border border-transparent hover:border-slate-200"
                )}
              >
                {page}
              </button>
            ))}
          </div>
          <button 
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(prev => prev + 1)}
            className="p-2 border border-slate-200 rounded-xl disabled:opacity-50 bg-white hover:bg-slate-50 transition-all text-black"
          >
            {isRtl ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
}

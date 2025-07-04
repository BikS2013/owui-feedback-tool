import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import './Pagination.css';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalRows: number;
  pageSize: number;
  onPageChange: (page: number, isJump?: boolean) => void;
  onPageSizeChange?: (pageSize: number) => void;
  isLoading?: boolean;
  displayedRows?: number;
}

export function Pagination({ currentPage, totalPages, totalRows, pageSize, onPageChange, onPageSizeChange, isLoading, displayedRows }: PaginationProps) {
  const pageSizeOptions = [10, 20, 50, 100, 200, 500];
  
  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPageSize = parseInt(e.target.value, 10);
    if (onPageSizeChange) {
      onPageSizeChange(newPageSize);
    }
  };
  const handlePrevious = () => {
    if (currentPage > 1 && !isLoading) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages && !isLoading) {
      onPageChange(currentPage + 1);
    }
  };

  const handleFirst = () => {
    if (currentPage > 1 && !isLoading) {
      onPageChange(1, true);
    }
  };

  const handleLast = () => {
    if (currentPage < totalPages && !isLoading) {
      onPageChange(totalPages, true);
    }
  };


  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="pagination-container">
      <div className="pagination-left">
        <div className="pagination-info">
          {displayedRows 
            ? `1-${displayedRows}/${totalRows} rows`
            : `${Math.min((currentPage - 1) * pageSize + 1, totalRows)}-${Math.min(currentPage * pageSize, totalRows)}/${totalRows} rows`
          }
        </div>
        {onPageSizeChange && (
          <div className="page-size-selector">
            <label>Show:</label>
            <select 
              value={pageSize} 
              onChange={handlePageSizeChange}
              disabled={isLoading}
            >
              {pageSizeOptions.map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>
        )}
      </div>
      
      <div className="pagination-controls">
        <button
          className="pagination-button"
          onClick={handleFirst}
          disabled={currentPage === 1 || isLoading}
          title="First page"
        >
          <ChevronsLeft size={16} />
        </button>
        
        <button
          className="pagination-button"
          onClick={handlePrevious}
          disabled={currentPage === 1 || isLoading}
          title="Previous page"
        >
          <ChevronLeft size={16} />
        </button>
        
        <button
          className="pagination-button"
          onClick={handleNext}
          disabled={currentPage === totalPages || isLoading}
          title="Next page"
        >
          <ChevronRight size={16} />
        </button>
        
        <button
          className="pagination-button"
          onClick={handleLast}
          disabled={currentPage === totalPages || isLoading}
          title="Last page"
        >
          <ChevronsRight size={16} />
        </button>
      </div>
    </div>
  );
}
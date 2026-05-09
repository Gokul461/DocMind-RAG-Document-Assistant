import { useEffect } from 'react';
import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';

import {
  FileText,
  Trash2,
  CheckSquare,
  Square,
  LayoutList,
} from 'lucide-react';

import {
  fetchDocuments,
  deleteDocument,
} from '../../services/api';

import { useAppStore } from '../../store/appStore';

import clsx from 'clsx';

export function DocumentList() {
  const qc = useQueryClient();

  const {
    documents,
    selectedDocIds,
    setDocuments,
    removeDocument,
    toggleDocSelection,
    selectAllDocs,
    clearSelection,
  } = useAppStore();

  const { data, isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: fetchDocuments,
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (data?.documents) {
      setDocuments(data.documents);
    }
  }, [data, setDocuments]);

  const deleteMutation = useMutation({
    mutationFn: deleteDocument,

    onSuccess: (_, doc_id) => {
      removeDocument(doc_id);

      qc.invalidateQueries({
        queryKey: ['documents'],
      });
    },
  });

  const allSelected =
    documents.length > 0 &&
    selectedDocIds.length === documents.length;

  if (isLoading) {
    return (
      <div className="p-6 space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-14 bg-gray-800 rounded-lg animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-3">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">
          Documents
        </h2>

        {documents.length > 0 && (
          <div className="flex items-center gap-3 text-sm">
            <span className="text-gray-600">
              {selectedDocIds.length} selected
            </span>

            <button
              onClick={
                allSelected
                  ? clearSelection
                  : selectAllDocs
              }
              className="text-indigo-400 hover:text-indigo-300 font-medium"
            >
              {allSelected
                ? 'Deselect all'
                : 'Select all'}
            </button>
          </div>
        )}
      </div>

      {/* Info Banner */}
      {selectedDocIds.length > 0 && (
        <div className="text-xs bg-indigo-950 text-indigo-400 rounded-lg px-3 py-2 border border-indigo-900">
          Queries will search only selected documents.
        </div>
      )}

      {/* Empty State */}
      {documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-12 text-gray-600">
          <LayoutList className="w-8 h-8" />

          <p className="text-sm">
            No documents yet - upload one above
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {documents.map((doc) => {
            const selected = selectedDocIds.includes(
              doc.doc_id
            );

            const confirmMsg =
              'Delete ' + doc.filename + '?';

            return (
              <li
                key={doc.doc_id}
                className={clsx(
                  'flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-colors group',

                  selected
                    ? 'border-indigo-700 bg-indigo-950'
                    : 'border-gray-800 bg-gray-900 hover:border-indigo-800 hover:bg-gray-800'
                )}
                onClick={() =>
                  toggleDocSelection(doc.doc_id)
                }
              >
                {selected ? (
                  <CheckSquare className="w-4 h-4 text-indigo-400 shrink-0" />
                ) : (
                  <Square className="w-4 h-4 text-gray-600 shrink-0 group-hover:text-gray-500" />
                )}

                <FileText className="w-4 h-4 text-indigo-500 shrink-0" />

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-200 truncate">
                    {doc.filename}
                  </p>

                  {doc.pages != null && (
                    <p className="text-xs text-gray-600">
                      {doc.pages} pages / {doc.chunks} chunks
                    </p>
                  )}
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();

                    if (confirm(confirmMsg)) {
                      deleteMutation.mutate(doc.doc_id);
                    }
                  }}
                  title={confirmMsg}
                  aria-label={`Delete ${doc.filename}`}
                  className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-opacity p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
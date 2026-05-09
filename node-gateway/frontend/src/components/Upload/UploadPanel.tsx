import { useCallback, useRef, useState } from 'react';
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
  X,
} from 'lucide-react';

import { ingestDocument } from '../../services/api';
import { useAppStore } from '../../store/appStore';

import clsx from 'clsx';

const ACCEPT = '.pdf,.docx,.txt';

export function UploadPanel() {
  const addDocument = useAppStore((s) => s.addDocument);

  const [state, setState] = useState({
    file: null as File | null,
    status: 'idle',
    progress: 0,
    message: '',
  });

  const [dragOver, setDragOver] = useState(false);

  const abortRef = useRef<any>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (state.status === 'uploading') return;

      setState({
        file,
        status: 'uploading',
        progress: 0,
        message: 'Starting...',
      });

      abortRef.current = ingestDocument(
        file,

        (event: any) => {
          setState((s) => ({
            ...s,
            progress: event.progress,
            message: event.message,
            status:
              event.status === 'complete'
                ? 'done'
                : event.status === 'error'
                ? 'error'
                : 'uploading',
          }));

          if (event.status === 'complete' && event.doc_id) {
            addDocument({
              doc_id: event.doc_id,
              filename: event.filename || file.name,
              pages: event.stats?.pages,
              chunks: event.stats?.chunks,
            });
          }
        },

        (msg: string) =>
          setState((s) => ({
            ...s,
            status: 'error',
            message: msg,
          }))
      );
    },
    [state.status, addDocument]
  );

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLLabelElement>) => {
      e.preventDefault();

      setDragOver(false);

      const file = e.dataTransfer.files[0];

      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const reset = () => {
    abortRef.current?.abort();

    setState({
      file: null,
      status: 'idle',
      progress: 0,
      message: '',
    });
  };

  const progressStyle = {
    width: `${state.progress}%`,
  };

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-lg font-semibold text-white">
        Upload Document
      </h2>

      <p className="text-sm text-gray-500">
        PDF, DOCX, or TXT up to 50MB
      </p>

      <label
        className={clsx(
          'flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl p-10 cursor-pointer transition-colors',

          dragOver
            ? 'border-indigo-500 bg-indigo-950'
            : 'border-gray-700 hover:border-indigo-600 hover:bg-gray-800',

          state.status === 'uploading' &&
            'pointer-events-none opacity-60'
        )}
        onDrop={onDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
      >
        <Upload className="w-8 h-8 text-gray-500" />

        <div className="text-center">
          <span className="text-sm font-medium text-indigo-400">
            Click to browse
          </span>

          <span className="text-sm text-gray-500">
            {' '}
            or drag and drop
          </span>
        </div>

        <input
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.[0]) {
              handleFile(e.target.files[0]);
            }
          }}
        />
      </label>

      {state.file && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-gray-300 truncate">
              <FileText className="w-4 h-4 shrink-0 text-indigo-400" />

              <span className="truncate font-medium">
                {state.file.name}
              </span>
            </div>

            {state.status !== 'uploading' && (
              <button
                type="button"
                onClick={reset}
                className="text-gray-600 hover:text-gray-400 ml-2"
                aria-label="Remove uploaded file"
                title="Remove uploaded file"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
            <div
              className={clsx(
                'h-2 rounded-full transition-all duration-300',

                state.status === 'error' && 'bg-red-500',

                state.status === 'done' && 'bg-green-500',

                state.status === 'uploading' && 'bg-indigo-500'
              )}
              style={progressStyle}
            />
          </div>

          <div className="flex items-center gap-2 text-sm">
            {state.status === 'uploading' && (
              <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
            )}

            {state.status === 'done' && (
              <CheckCircle className="w-4 h-4 text-green-400" />
            )}

            {state.status === 'error' && (
              <AlertCircle className="w-4 h-4 text-red-400" />
            )}

            <span
              className={clsx(
                state.status === 'error' && 'text-red-400',

                state.status === 'done' && 'text-green-400',

                state.status === 'uploading' && 'text-gray-400'
              )}
            >
              {state.message}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
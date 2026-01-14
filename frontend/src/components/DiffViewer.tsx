import React from 'react';
import { structuredPatch, type Hunk } from 'diff';
import './DiffViewer.css';

interface DiffViewerProps {
  oldText: string;
  newText: string;
  oldStartLine?: number;
  newStartLine?: number;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({
  oldText,
  newText,
  oldStartLine = 1,
  newStartLine = 1,
}) => {
  const patch = structuredPatch('old', 'new', oldText, newText, '', '', { context: 3 });

  if (!patch.hunks || patch.hunks.length === 0) {
    return (
      <pre className="diff-container">
        <code>No changes detected.</code>
      </pre>
    );
  }

  return (
    <pre className="diff-container">
      <code>
        {patch.hunks.map((hunk: Hunk, hunkIndex: number) => {
          // Adjust the initial counters by the provided start line props
          let oldLineCounter = hunk.oldStart + (oldStartLine - 1);
          let newLineCounter = hunk.newStart + (newStartLine - 1);

          // Also adjust the numbers in the hunk header display
          const adjustedOldStart = hunk.oldStart + (oldStartLine - 1);
          const adjustedNewStart = hunk.newStart + (newStartLine - 1);

          return (
            <div key={hunkIndex} className="diff-hunk">
              <div className="hunk-header">
                <span className="line-gutter">...</span>
                <span className="line-content">{`@@ -${adjustedOldStart},${hunk.oldLines} +${adjustedNewStart},${hunk.newLines} @@`}</span>
              </div>
              {hunk.lines
                .filter((line: string) => {
                  // 过滤掉 "No newline at end of file" 行
                  const content = line.substring(1).trim();
                  return content !== 'No newline at end of file';
                })
                .map((line: string, lineIndex: number) => {
                  const lineType = line.startsWith('+') ? 'add' : line.startsWith('-') ? 'del' : 'context';
                  let className = 'diff-line';
                  let oldLineNum = '';
                  let newLineNum = '';

                  switch (lineType) {
                    case 'add':
                      className += ' diff-added';
                      newLineNum = (newLineCounter++).toString();
                      break;
                    case 'del':
                      className += ' diff-removed';
                      oldLineNum = (oldLineCounter++).toString();
                      break;
                    case 'context':
                      oldLineNum = (oldLineCounter++).toString();
                      newLineNum = (newLineCounter++).toString();
                      break;
                  }

                  return (
                    <div key={lineIndex} className={className}>
                      <span className="line-gutter">
                        {oldLineNum.padStart(4)} {newLineNum.padStart(4)}
                      </span>
                      <span className="line-prefix">{line.charAt(0)}</span>
                      <span className="line-content">{line.substring(1)}</span>
                    </div>
                  );
                })}
            </div>
          );
        })}
      </code>
    </pre>
  );
};

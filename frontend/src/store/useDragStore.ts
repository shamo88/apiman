import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { ProjectTree } from './useProjectStore';

interface DragState {
  // API树拖拽
  draggingNode: { type: 'request' | 'folder'; path: string } | null;
  dropTargetFolderPath: string | null;
  invalidDropHint: { message: string; x: number; y: number } | null;
  movedHighlightPath: string | null;

  // 项目拖拽
  draggingProjectId: string | null;
  projectDropTargetGroup: string | null;
  draggingGroupName: string | null;
  groupSortDropTarget: string | null;
}

interface DragActions {
  setDraggingNode: (node: { type: 'request' | 'folder'; path: string } | null) => void;
  setDropTarget: (path: string | null) => void;
  setInvalidDropHint: (hint: { message: string; x: number; y: number } | null) => void;
  setMovedHighlightPath: (path: string | null) => void;
  clearDragState: () => void;
  setDraggingProjectId: (id: string | null) => void;
  setProjectDropTargetGroup: (group: string | null) => void;
  setDraggingGroupName: (name: string | null) => void;
  setGroupSortDropTarget: (group: string | null) => void;
}

type DragStore = DragState & DragActions;

export const useDragStore = create<DragStore>()(
  devtools(
    (set) => ({
      // API树拖拽初始状态
      draggingNode: null,
      dropTargetFolderPath: null,
      invalidDropHint: null,
      movedHighlightPath: null,

      // 项目拖拽初始状态
      draggingProjectId: null,
      projectDropTargetGroup: null,
      draggingGroupName: null,
      groupSortDropTarget: null,

      // API树拖拽操作
      setDraggingNode: (node) => set({ draggingNode: node }),
      setDropTarget: (path) => set({ dropTargetFolderPath: path }),
      setInvalidDropHint: (hint) => set({ invalidDropHint: hint }),
      setMovedHighlightPath: (path) => set({ movedHighlightPath: path }),
      clearDragState: () => set({
        draggingNode: null,
        dropTargetFolderPath: null,
        invalidDropHint: null,
      }),

      // 项目拖拽操作
      setDraggingProjectId: (id) => set({ draggingProjectId: id }),
      setProjectDropTargetGroup: (group) => set({ projectDropTargetGroup: group }),
      setDraggingGroupName: (name) => set({ draggingGroupName: name }),
      setGroupSortDropTarget: (group) => set({ groupSortDropTarget: group }),
    }),
    { name: 'DragStore' }
  )
);

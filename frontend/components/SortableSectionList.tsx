"use client";

import React, { useCallback } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
  arraySwap,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export interface SortableSectionListRenderProps<T> {
  /** Attach to the card wrapper so the whole card is draggable */
  sortableProps: {
    setNodeRef: (node: HTMLElement | null) => void;
    style: React.CSSProperties;
    /** Spread onto the draggable element (role, tabIndex, etc.) */
    attributes: object;
    /** Spread onto the draggable element for pointer/keyboard drag; omit when editing */
    listeners: object | undefined;
    isDragging: boolean;
  };
  moveUp: () => void;
  moveDown: () => void;
  moveUpDisabled: boolean;
  moveDownDisabled: boolean;
}

export interface SortableSectionListProps<T extends { id: string }> {
  items: T[];
  onReorder: (orderedIds: string[]) => Promise<void>;
  renderItem: (item: T, index: number, props: SortableSectionListRenderProps<T>) => React.ReactNode;
  /** When true, show reorder UI but disabled/grayed (e.g. when 0 or 1 item) */
  reorderDisabled?: boolean;
}

function SortableItem<T extends { id: string }>({
  item,
  index,
  total,
  renderItem,
  onMoveUp,
  onMoveDown,
  reorderDisabled,
}: {
  item: T;
  index: number;
  total: number;
  renderItem: (item: T, index: number, props: SortableSectionListRenderProps<T>) => React.ReactNode;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  reorderDisabled: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.id,
    disabled: reorderDisabled,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const moveUp = useCallback(() => onMoveUp(index), [index, onMoveUp]);
  const moveDown = useCallback(() => onMoveDown(index), [index, onMoveDown]);

  return (
    <>
      {renderItem(item, index, {
        sortableProps: {
          setNodeRef,
          style,
          attributes,
          listeners: reorderDisabled ? undefined : listeners,
          isDragging,
        },
        moveUp,
        moveDown,
        moveUpDisabled: reorderDisabled || index === 0,
        moveDownDisabled: reorderDisabled || index === total - 1,
      })}
    </>
  );
}

export function SortableSectionList<T extends { id: string }>({
  items,
  onReorder,
  renderItem,
  reorderDisabled = false,
}: SortableSectionListProps<T>) {
  const itemIds = items.map((i) => i.id);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id || reorderDisabled) return;
      const oldIndex = itemIds.indexOf(active.id as string);
      const newIndex = itemIds.indexOf(over.id as string);
      if (oldIndex === -1 || newIndex === -1) return;
      const newIds = arrayMove(itemIds, oldIndex, newIndex);
      onReorder(newIds);
    },
    [itemIds, onReorder, reorderDisabled]
  );

  const handleMoveUp = useCallback(
    (index: number) => {
      if (index <= 0 || reorderDisabled) return;
      const newIds = arraySwap(itemIds, index - 1, index);
      onReorder(newIds);
    },
    [itemIds, onReorder, reorderDisabled]
  );

  const handleMoveDown = useCallback(
    (index: number) => {
      if (index >= itemIds.length - 1 || reorderDisabled) return;
      const newIds = arraySwap(itemIds, index, index + 1);
      onReorder(newIds);
    },
    [itemIds, onReorder, reorderDisabled]
  );

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        {items.map((item, index) => (
          <SortableItem
            key={item.id}
            item={item}
            index={index}
            total={items.length}
            renderItem={renderItem}
            onMoveUp={handleMoveUp}
            onMoveDown={handleMoveDown}
            reorderDisabled={reorderDisabled}
          />
        ))}
      </SortableContext>
    </DndContext>
  );
}

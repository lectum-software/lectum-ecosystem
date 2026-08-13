"use client";

import {
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
} from "react";
import {
  Controller,
  type ControllerFieldState,
  type ControllerRenderProps,
  type FieldValues,
} from "react-hook-form";
import { Container } from "@/components/controllers/container";
import { describedBy, fieldId } from "@/components/controllers/utils";
import type { ControllerFieldProps } from "@/hooks/form";
import { cn } from "@/lib/utils";

const normalizeEditableText = (value: string) => value.replace(/\r\n?/g, "\n");

const selectionBelongsToElement = (element: HTMLElement, selection: Selection | null) => {
  if (!selection || selection.rangeCount === 0) return false;

  const { anchorNode, focusNode } = selection;

  return Boolean(
    anchorNode &&
      focusNode &&
      (anchorNode === element || element.contains(anchorNode)) &&
      (focusNode === element || element.contains(focusNode)),
  );
};

const selectedTextLength = (element: HTMLElement) => {
  const selection = window.getSelection();
  if (!selectionBelongsToElement(element, selection)) return 0;

  return normalizeEditableText(selection?.toString() ?? "").length;
};

const plainTextOffsetFromSelection = (element: HTMLElement) => {
  const selection = window.getSelection();
  if (!selectionBelongsToElement(element, selection) || !selection?.isCollapsed) return null;

  const focusNode = selection.focusNode;
  if (!focusNode) return null;

  try {
    const range = document.createRange();
    range.selectNodeContents(element);
    range.setEnd(focusNode, selection.focusOffset);

    return normalizeEditableText(range.toString()).length;
  } catch {
    return null;
  }
};

const moveCaretToTextOffset = (element: HTMLElement, offset: number) => {
  const selection = window.getSelection();
  if (!selection) return;

  const safeOffset = Math.max(0, offset);
  let traversed = 0;
  let targetNode: Text | null = null;
  let targetOffset = 0;
  let lastTextNode: Text | null = null;

  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  let currentNode = walker.nextNode() as Text | null;

  while (currentNode) {
    lastTextNode = currentNode;
    const textLength = normalizeEditableText(currentNode.data).length;

    if (traversed + textLength >= safeOffset) {
      targetNode = currentNode;
      targetOffset = Math.min(currentNode.data.length, Math.max(0, safeOffset - traversed));
      break;
    }

    traversed += textLength;
    currentNode = walker.nextNode() as Text | null;
  }

  if (!targetNode && lastTextNode) {
    targetNode = lastTextNode;
    targetOffset = lastTextNode.data.length;
  }

  const range = document.createRange();
  if (targetNode) {
    range.setStart(targetNode, targetOffset);
    range.setEnd(targetNode, targetOffset);
  } else {
    range.setStart(element, 0);
    range.setEnd(element, 0);
  }
  selection.removeAllRanges();
  selection.addRange(range);
};

const moveCaretToEnd = (element: HTMLElement) => {
  moveCaretToTextOffset(element, normalizeEditableText(element.textContent ?? "").length);
};

const hasOnlyTextNodes = (element: HTMLElement) =>
  Array.from(element.childNodes).every((node) => node.nodeType === Node.TEXT_NODE);

const replaceSelectionWithText = (element: HTMLElement, text: string) => {
  if (!text) return;

  element.focus({ preventScroll: true });
  const selection = window.getSelection();

  if (!selectionBelongsToElement(element, selection)) {
    element.textContent = `${element.textContent ?? ""}${text}`;
    moveCaretToEnd(element);
    return;
  }

  const range = selection?.getRangeAt(0);
  if (!range) return;

  range.deleteContents();
  const textNode = document.createTextNode(text);
  range.insertNode(textNode);
  range.setStart(textNode, textNode.data.length);
  range.setEnd(textNode, textNode.data.length);
  selection?.removeAllRanges();
  selection?.addRange(range);
};

type ContenteditableElementProps<FormType extends FieldValues> = Pick<
  ControllerFieldProps<FormType>,
  | "autoFocus"
  | "autoGrow"
  | "className"
  | "description"
  | "disabled"
  | "inputClassName"
  | "label"
  | "max"
  | "name"
  | "onChangeCallback"
  | "placeholder"
  | "readOnly"
  | "required"
  | "tabIndex"
  | "tooltip"
> & {
  field: ControllerRenderProps<FormType>;
  fieldState: ControllerFieldState;
  inputId: string;
};

function ContenteditableElement<FormType extends FieldValues>({
  autoFocus,
  autoGrow,
  className,
  description,
  disabled,
  field,
  fieldState,
  inputClassName,
  inputId,
  label,
  max,
  name,
  onChangeCallback,
  placeholder,
  readOnly,
  required,
  tabIndex,
  tooltip,
}: ContenteditableElementProps<FormType>) {
  const editableRef = useRef<HTMLDivElement | null>(null);
  const hasAutoFocused = useRef(false);
  const error = fieldState.error?.message;
  const value = normalizeEditableText(
    typeof field.value === "string" ? field.value : field.value == null ? "" : String(field.value),
  );
  const maxLength = typeof max === "number" && max > 0 ? max : undefined;

  const commitElementValue = useCallback(
    (element: HTMLDivElement) => {
      const rawValue = normalizeEditableText(element.textContent ?? "");
      const nextValue = maxLength ? rawValue.slice(0, maxLength) : rawValue;
      const caretOffset = plainTextOffsetFromSelection(element);

      if (
        nextValue !== rawValue ||
        !hasOnlyTextNodes(element) ||
        (nextValue.length === 0 && element.childNodes.length > 0)
      ) {
        element.textContent = nextValue;
        moveCaretToTextOffset(element, caretOffset ?? nextValue.length);
      }

      field.onChange(nextValue);
      onChangeCallback?.(nextValue);
    },
    [field, maxLength, onChangeCallback],
  );

  useEffect(() => {
    const element = editableRef.current;
    if (!element) return;
    if (normalizeEditableText(element.textContent ?? "") === value) return;

    element.textContent = value;
    if (document.activeElement === element) {
      moveCaretToEnd(element);
    }
  }, [value]);

  const handleBeforeInput = (event: FormEvent<HTMLDivElement>) => {
    if (!maxLength) return;

    const nativeEvent = event.nativeEvent as InputEvent;
    if (nativeEvent.inputType.startsWith("delete")) return;

    const element = event.currentTarget;
    const currentLength = normalizeEditableText(element.textContent ?? "").length;
    const replacingLength = selectedTextLength(element);
    const incomingLength =
      nativeEvent.inputType === "insertParagraph" || nativeEvent.inputType === "insertLineBreak"
        ? 1
        : normalizeEditableText(nativeEvent.data ?? "").length;

    if (incomingLength <= 0) return;

    if (currentLength - replacingLength + incomingLength > maxLength) {
      event.preventDefault();
    }
  };

  const handleInput = (event: FormEvent<HTMLDivElement>) => {
    commitElementValue(event.currentTarget);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (
      event.key !== "Enter" ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.nativeEvent.isComposing
    ) {
      return;
    }

    event.preventDefault();

    const element = event.currentTarget;
    const currentLength = normalizeEditableText(element.textContent ?? "").length;
    const replacingLength = selectedTextLength(element);
    if (maxLength && currentLength - replacingLength + 1 > maxLength) return;

    replaceSelectionWithText(element, "\n");
    commitElementValue(element);
  };

  const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    const plainText = normalizeEditableText(event.clipboardData.getData("text/plain"));
    if (!plainText) return;

    event.preventDefault();

    const element = event.currentTarget;
    const currentLength = normalizeEditableText(element.textContent ?? "").length;
    const replacingLength = selectedTextLength(element);
    const availableLength = maxLength
      ? Math.max(0, maxLength - (currentLength - replacingLength))
      : plainText.length;
    const nextText = plainText.slice(0, availableLength);

    replaceSelectionWithText(element, nextText);
    commitElementValue(element);
  };

  return (
    <Container
      className={className}
      description={description}
      error={error}
      htmlFor={inputId}
      label={label}
      name={String(name)}
      required={required}
      skipHtmlFor
      tooltip={tooltip}
    >
      {/* biome-ignore lint/a11y/useSemanticElements: contenteditable is intentional for mobile free-text editors; role keeps textbox semantics without using a native form field. */}
      <div
        aria-describedby={describedBy({ id: inputId, description, error })}
        aria-disabled={disabled || undefined}
        aria-invalid={Boolean(error)}
        aria-label={label ?? placeholder ?? String(name)}
        aria-multiline="true"
        aria-placeholder={placeholder}
        aria-readonly={readOnly || undefined}
        className={cn(
          "min-h-28 w-full whitespace-pre-wrap break-words rounded-[var(--lectum-control-radius)] border border-border bg-surface px-4 py-3 text-sm text-foreground shadow-sm outline-none transition empty:before:pointer-events-none empty:before:text-subtle empty:before:content-[attr(data-placeholder)] focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted",
          "[-webkit-user-modify:read-write-plaintext-only]",
          error && "border-danger focus:border-danger focus:ring-danger/10",
          (disabled || readOnly) && "cursor-not-allowed bg-surface-muted text-muted",
          autoGrow && "resize-none overflow-y-auto",
          inputClassName,
        )}
        contentEditable={disabled || readOnly ? false : "plaintext-only"}
        data-placeholder={placeholder}
        id={inputId}
        inputMode="text"
        onBeforeInput={handleBeforeInput}
        onBlur={field.onBlur}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        ref={(element) => {
          editableRef.current = element;
          field.ref(element);

          if (element && normalizeEditableText(element.textContent ?? "") !== value) {
            element.textContent = value;
          }

          if (autoFocus && element && !disabled && !readOnly && !hasAutoFocused.current) {
            hasAutoFocused.current = true;
            element.focus({ preventScroll: true });
          }
        }}
        role="textbox"
        spellCheck
        suppressContentEditableWarning
        tabIndex={disabled ? -1 : tabIndex}
      />
    </Container>
  );
}

export function ContenteditableController<FormType extends FieldValues>({
  name,
  control,
  className,
  inputClassName,
  label,
  required,
  tooltip,
  description,
  id,
  placeholder,
  autoGrow,
  autoFocus,
  disabled,
  readOnly,
  tabIndex,
  max,
  onChangeCallback,
}: ControllerFieldProps<FormType>) {
  const inputId = fieldId(name, id);

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <ContenteditableElement
          autoFocus={autoFocus}
          autoGrow={autoGrow}
          className={className}
          description={description}
          disabled={disabled}
          field={field}
          fieldState={fieldState}
          inputClassName={inputClassName}
          inputId={inputId}
          label={label}
          max={max}
          name={name}
          onChangeCallback={onChangeCallback}
          placeholder={placeholder}
          readOnly={readOnly}
          required={required}
          tabIndex={tabIndex}
          tooltip={tooltip}
        />
      )}
    />
  );
}

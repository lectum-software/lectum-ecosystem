export const normalizeEditableText = (value: string) => value.replace(/\r\n?/g, "\n");

// React's beforeinput may wrap a TextEvent rather than an InputEvent.
export const getEditableIncomingLength = (event: { inputType?: string; data?: string | null }) => {
  const inputType = typeof event.inputType === "string" ? event.inputType : "";
  if (inputType.startsWith("delete")) return 0;
  if (inputType === "insertParagraph" || inputType === "insertLineBreak") return 1;
  return typeof event.data === "string" ? normalizeEditableText(event.data).length : 0;
};

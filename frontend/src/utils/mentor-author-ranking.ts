type RankedMentor = { position: number; professional: { id: string } };

export const mentorPositionForAuthor = (
  ranking: readonly RankedMentor[] | undefined,
  authorId: string | undefined,
) => {
  if (!authorId) return undefined;
  const position = ranking?.find((item) => item.professional.id === authorId)?.position;
  return position && Number.isInteger(position) && position >= 1 && position <= 3
    ? position
    : undefined;
};

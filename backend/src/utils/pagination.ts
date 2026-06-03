export const format = (control: any) => {
  const page = (control?.page || 1) - 1;

  return {
    search: control?.search || "",
    page: control?.page || 1,
    limit: control?.limit || 1,
    control: {
      take: control?.limit,
      skip: page * (control?.limit || 0),
      orderBy: {
        [control?.orderKey || "createdAt"]: control?.orderValue || "desc",
      },
    },
  };
};

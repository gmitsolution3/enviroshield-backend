import { TPaginationOptions } from "../types/common";

export const calculatePagination = (options: TPaginationOptions) => {
  const page = Math.max(1, Number(options.page) || 1);

  const limit = Math.max(1, Number(options.limit) || 10);

  const skip = (page - 1) * limit;

  return {
    page,
    limit,
    skip,
  };
};

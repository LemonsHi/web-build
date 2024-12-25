interface TaskParams {
  rootDir?: string;
  worker: any;
  task: [string, string] | [string, string, string];
  options: Record<string, string>;
}

export const anylysisTask = async ({ worker, task, options }: TaskParams) => {
  try {
    if (!task) {
      return;
    }
    await worker.setPadding(true);

    const response = await worker.dependenciesAnylysis(task, options);

    return response;
  } finally {
    await worker.setPadding(false);
  }
};

export const installTask = async ({
  rootDir,
  worker,
  task,
  options,
}: TaskParams) => {
  try {
    if (!task) {
      return;
    }
    await worker.setPadding(true);
    await worker.installDependencies(rootDir, task, options);
  } finally {
    await worker.setPadding(false);
  }
};

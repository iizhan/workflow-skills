import type { WorkbenchApi } from "../../shared/types";

declare global {
  interface Window {
    workbench: WorkbenchApi;
  }
}

export {};

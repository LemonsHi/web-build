import { PluginBuild } from 'esbuild-wasm';

export interface IPlugin {
  name: string;
  setup: (build: PluginBuild) => void;
}

export type LogType = 'info' | 'warn' | 'error';

export interface ILogItem {
  timestamp: string;
  type: LogType;
  message: string;
}

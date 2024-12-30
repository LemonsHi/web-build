import { IFile } from '../../WebContainer';

export type IHtmlTemplate = (codeString?: string, cssString?: string) => string;

export interface IDemo {
  file: IFile;
  htmlTemplate?: IHtmlTemplate;
}

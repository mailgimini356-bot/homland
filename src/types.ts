export interface SavedLink {
  id: string;
  url: string;
  title: string;
  category: string;
  description: string;
  tags: string[];
  timestamp: string;
}

export interface DesktopConfig {
  listenPinterestOnly: boolean;
  autoSaveDocx: boolean;
  autoSaveTxt: boolean;
  savePath: string;
}

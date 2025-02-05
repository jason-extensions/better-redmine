interface RedmineItem {
  project: string;
  tracker: string;
  status: string;
  subject: string;
  url: string;
  id: string;
  date: string;
  replies: string;
  issues: string;
  [key: string]: string;
}

interface MessageResponse {
  data?: RedmineItem[];
  success?: boolean;
  error?: string;
}

interface ToggleMessage {
  action: "toggleVisibility";
  showOnlySelected: boolean;
}

interface GetDataMessage {
  action: "getSelectedData";
}

interface BatchUpdateMessage {
  action: "batchUpdate";
  key: string;
  value: string;
}

type Message = ToggleMessage | GetDataMessage | BatchUpdateMessage;

declare namespace chrome.runtime {
  interface MessageSender {
    tab?: chrome.tabs.Tab;
    frameId?: number;
    id?: string;
    url?: string;
    tlsChannelId?: string;
  }
}

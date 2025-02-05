interface RedmineItem {
  project: string;
  tracker: string;
  status: string;
  subject: string;
  url: string;
  id: string;
  [key: string]: string;
}

interface MessageResponse {
  data?: RedmineItem[];
  success?: boolean;
}

interface ToggleMessage {
  action: "toggleVisibility";
  showOnlySelected: boolean;
}

interface GetDataMessage {
  action: "getSelectedData";
}

type Message = ToggleMessage | GetDataMessage;

declare namespace chrome.runtime {
  interface MessageSender {
    tab?: chrome.tabs.Tab;
    frameId?: number;
    id?: string;
    url?: string;
    tlsChannelId?: string;
  }
}
